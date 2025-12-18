'use strict';

// Load logger first so all subsequent console.* calls are captured
import './logger.js';

import { setupController } from './controller.js';

document.addEventListener('DOMContentLoaded', () => {
  setupController();
});