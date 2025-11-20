import { Router } from 'express';
import * as blockchainController from '../app/controllers/blockchainController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as blockchainRequest from '../app/requests/blockchainRequest.js';

const blockchainRouter = Router();

blockchainRouter.use(requireAuthentication);

blockchainRouter.get('/green-credit', blockchainController.getGreenCreditSummary);
blockchainRouter.post(
  '/green-credit/sync',
  validate(blockchainRequest.requestGreenCreditSync),
  blockchainController.requestGreenCreditSync
);

blockchainRouter.get('/developer/apps', blockchainController.listDeveloperApps);
blockchainRouter.post(
  '/developer/apps',
  validate(blockchainRequest.registerDeveloperApp),
  blockchainController.registerDeveloperApp
);

blockchainRouter.get('/developer/metrics', blockchainController.getDeveloperMetrics);

blockchainRouter.post(
  '/simple-token/execute',
  validate(blockchainRequest.executeSimpleToken),
  blockchainController.executeSimpleToken
);

blockchainRouter.get(
  '/simple-token/history',
  (req, res, next) => {
    req.body = { ...req.query };
    return next();
  },
  validate(blockchainRequest.listSimpleTokenHistory),
  blockchainController.listSimpleTokenHistory
);

blockchainRouter.get(
  '/simple-token/alerts',
  (req, res, next) => {
    req.body = { ...req.query };
    return next();
  },
  validate(blockchainRequest.listSimpleTokenAlerts),
  blockchainController.listSimpleTokenAlerts
);

blockchainRouter.get(
  '/simple-token/admin/calls',
  blockchainController.listHscoinAdminCalls
);

export default blockchainRouter;
