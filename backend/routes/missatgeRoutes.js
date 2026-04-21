import express from 'express';
import { verificarAuth } from '../middleware/authMiddleware.js';
import { qualsevolRol } from '../middleware/roleMiddleware.js';
import {
  enviarMissatge,
  obtenirHistorial,
  marcarLlegit
} from '../controllers/missatgeController.js';

const router = express.Router();

router.use(verificarAuth);

router.post('/', qualsevolRol, enviarMissatge);
router.get('/', qualsevolRol, obtenirHistorial);
router.patch('/:id/llegit', qualsevolRol, marcarLlegit);

export default router;