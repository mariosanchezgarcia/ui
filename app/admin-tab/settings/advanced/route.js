
import Ember from 'ember';
import C from 'ui/utils/constants';

export default Ember.Route.extend({
  settings: Ember.inject.service(),

  beforeModel() {
    return this.get('settings').load([
      C.SETTING.TELEMETRY,
    ]);
  },

  model() {
    let settings = this.get('settings');

    return this.get('userStore').find('setting').then(() => {
      return Ember.Object.create({
        telemetry: settings.get(C.SETTING.TELEMETRY),
      });
    });
  },

  resetController(controller, isExiting /*, transition*/ ) {
    if (isExiting) {
      controller.set('error', null);
    }
  }
});
