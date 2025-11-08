import express from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  updateCashReceived,
  deleteInvoice,
  getDashboardStats,
} from '../controllers/invoiceController';

const router = express.Router();

router.get('/', getAllInvoices);
router.get('/stats/dashboard', getDashboardStats);
router.get('/:id', getInvoiceById);
router.get('/number/:invoiceNumber', getInvoiceByNumber);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/status', updateInvoiceStatus);
router.patch('/:id/cash-received', updateCashReceived);
router.delete('/:id', deleteInvoice);

export default router;
