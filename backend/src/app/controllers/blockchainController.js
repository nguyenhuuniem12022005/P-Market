import * as blockchainService from '../services/blockchainService.js';

export async function getGreenCreditSummary(req, res, next) {
  try {
    const data = await blockchainService.getGreenCreditSummary(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Fetch green credit summary successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestGreenCreditSync(req, res, next) {
  try {
    const data = await blockchainService.requestGreenCreditSync(req.user?.userId, req.body?.reason);
    return res.status(200).json({
      success: true,
      message: 'Green credit on-chain sync has been queued',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listDeveloperApps(req, res, next) {
  try {
    const data = await blockchainService.getDeveloperApps(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Fetch developer apps successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function registerDeveloperApp(req, res, next) {
  try {
    const payload = {
      ...req.body,
      ownerId: req.user?.userId,
    };
    const data = await blockchainService.registerDeveloperApp(payload);
    return res.status(201).json({
      success: true,
      message: 'Developer app registered successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDeveloperMetrics(req, res, next) {
  try {
    const data = await blockchainService.getDeveloperMetrics(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Fetch developer metrics successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}
