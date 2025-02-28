import Service, { inject as service } from '@ember/service';
import { computed, get, set } from '@ember/object';
import StatefulPromise from 'shared/utils/stateful-promise';

const CONFIG_MAP_FILE_KEY = 'config.json'
const CONFIG_MAP_NAMESPACE_ID = 'security-scan';
const CONFIG_MAP_NAME = 'security-scan-cfg';
const CONFIG_MAP_ID = `${ CONFIG_MAP_NAMESPACE_ID }:${ CONFIG_MAP_NAME }`;
const CONFIG_MAP_DEFAULT_VALUE = { skip: [] };
const CONFIG_MAP_DEFAULT_DATA = { [CONFIG_MAP_FILE_KEY]: JSON.stringify(CONFIG_MAP_DEFAULT_VALUE) };

export default Service.extend({
  scope:        service(),
  growl:        service(),
  intl:         service(),
  projectStore: service('store'),

  FILE_KEY: CONFIG_MAP_FILE_KEY,

  asyncConfigMap: computed(function() {
    return StatefulPromise.wrap(get(this, 'scope.currentCluster.systemProject').followLink('configMaps'));
  }),

  configMaps: computed('asyncConfigMap.value', function() {
    return get(this, 'asyncConfigMap.value');
  }),

  securityScanConfig: computed('configMaps.@each', function() {
    return get(this, 'configMaps').findBy('id', 'security-scan:security-scan-cfg');
  }),

  parsedSecurityScanConfig: computed('securityScanConfig.data.@each', function() {
    try {
      return JSON.parse(get(this, 'securityScanConfig.data')[CONFIG_MAP_FILE_KEY]);
    } catch (error) {
      return CONFIG_MAP_DEFAULT_VALUE;
    }
  }).volatile(),

  validateSecurityScanConfig() {
    try {
      const data = get(this, `securityScanConfig.data`);

      if (!data) {
        return;
      }

      const configFile = data[CONFIG_MAP_FILE_KEY];

      if (!configFile) {
        return;
      }
      const parsed = JSON.parse(configFile);

      if (!Array.isArray(parsed.skip)) {
        throw new Error("Security Scan Config didin't contain the 'skip' array.");
      }
    } catch (error) {
      this.growl.fromError(this.intl.t('cis.scan.detail.error.parseConfig'), error.message);
      throw error;
    }
  },

  skipList: computed('securityScanConfig.data.@each', function() {
    const securityScanConfig = get(this, 'securityScanConfig');

    if (!securityScanConfig) {
      return [];
    }

    const skip = get(this, 'parsedSecurityScanConfig.skip');

    return Array.isArray(skip) ? skip : [];
  }),

  async editSecurityScanConfig(newValue) {
    const securityScanConfig = await Promise.resolve(get(this, 'securityScanConfig') || this.createAndSaveDefaultConfigMap());

    set(securityScanConfig, 'data', newValue);
    securityScanConfig.save();
  },

  async createAndSaveDefaultConfigMap() {
    try {
      const configMaps = get(this, 'configMaps');
      const systemProjectLink = get(this, 'scope.currentCluster.systemProject.links.self');
      const creationUrl =  `${ systemProjectLink }/configmap`;
      const recordLink =  `${ systemProjectLink }/configMaps/${ CONFIG_MAP_ID }`;
      const configRecord = get(this, 'projectStore').createRecord({
        type:        'configMap',
        id:          CONFIG_MAP_ID,
        namespaceId: CONFIG_MAP_NAMESPACE_ID,
        name:        CONFIG_MAP_NAME,
        data:        CONFIG_MAP_DEFAULT_DATA,
        links:       {}
      });

      configMaps.pushObject(configRecord);
      await configRecord.save({
        url:    creationUrl,
        method: 'POST'
      });

      // We have to set this link after .save instead of before because .save will attempt to
      // use the self link to save the record and saving the record isn't setting the self link.
      set(configRecord, 'links.self', recordLink);

      return configRecord;
    } catch (error) {
      this.growl.fromError(this.intl.t('cis.scan.detail.error.createDefault'), error.message);
    }
  },

  editSkipList(newValue) {
    const newSkipListObject = { skip: newValue };
    const newConfig = { [get(this, 'FILE_KEY')]: JSON.stringify(newSkipListObject) };

    this.editSecurityScanConfig(newConfig);
  }
});
