/**
 * @file Factual Base
 * @name Factual
 *
 * Factual extension base code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import config from './config';

window._trackJs = {
  token: config.trackjs,
};

require('trackjs');

class FactualBase {
  constructor() {
  }
}

export default FactualBase;
