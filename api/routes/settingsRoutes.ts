import express from 'express';
import {
  getSettings,
  updateSettings,
  updateShopInfo,
  updateTaxConfig,
  updateMetalRates,
  updateProductTypes,
  resetSettings,
} from '../controllers/settingsController';

const router = express.Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.put('/shop-info', updateShopInfo);
router.put('/tax-config', updateTaxConfig);
router.put('/metal-rates', updateMetalRates);
router.put('/product-types', updateProductTypes);
router.post('/reset', resetSettings);

export default router;
