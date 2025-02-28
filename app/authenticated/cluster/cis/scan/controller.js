import Controller from '@ember/controller';
import { downloadFile, generateZip } from 'shared/utils/download-files';
import { get, computed } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  scope:              service(),
  modalService:       service('modal'),
  securityScanConfig: service(),

  tableHeaders: [
    {
      name:           'state',
      sort:           ['state', 'number', 'id'],
      translationKey: 'cis.scan.table.state',
      width:          100,
    },
    {
      name:           'name',
      sort:           ['id'],
      translationKey: 'cis.scan.table.name',
    },
    {
      name:           'passed',
      sort:           ['passed', 'id'],
      translationKey: 'cis.scan.table.passed',
      width:          150,
    },
    {
      name:           'skipped',
      sort:           ['skipped', 'id'],
      translationKey: 'cis.scan.table.skipped',
      width:          150,
    },
    {
      name:           'expires',
      sort:           ['failed', 'id'],
      translationKey: 'cis.scan.table.failed',
      width:          150,
    },
    {
      name:           'date',
      sort:           ['date', 'id'],
      searchField:    false,
      translationKey: 'cis.scan.table.date',
      width:          250,
    }
  ],

  runningClusterScans: computed.filterBy('clusterScans', 'isRunning', true),

  disableRunScanButton: computed.notEmpty('runningClusterScans'),

  isRKE:   computed.alias('scope.currentCluster.isRKE'),
  actions: {
    runScan() {
      this.securityScanConfig.validateSecurityScanConfig();
      get(this, 'scope.currentCluster').doAction('runSecurityScan', {
        failuresOnly: false,
        skip:         []
      });
    }
  },
  bulkActionHandler: computed(function() {
    return {
      download: async(scans) => {
        const asyncFiles = scans
          .map((scan) => get(scan, 'csvFile'))
        const files = await Promise.all(asyncFiles);
        const zip = await generateZip(files);

        await downloadFile(`cis-scans.zip`, zip, get(zip, 'type'));
      },
      promptDelete: async(scans) => {
        get(this, 'modalService').toggleModal('confirm-delete', {
          escToClose: true,
          resources:  scans
        });
      }
    };
  }),
  clusterScans: computed('model.clusterScans.@each', function() {
    return get(this, 'model.clusterScans').filterBy('clusterId', get(this, 'scope.currentCluster.id'));
  }),
});
