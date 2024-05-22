const Router = require('express')
const multer = require("multer");
const router = new Router()
const imageController = require('../controllers/imageController')
const authMiddleware = require('../middleware/authMiddleware')
const upload = multer({ storage: multer.memoryStorage() }).array('images', 100);

router.post('/', upload, authMiddleware,  imageController.uploadImages)
router.get('/', authMiddleware,  imageController.search)
router.get('/:id', authMiddleware,  imageController.getImage)
router.patch('/:id', authMiddleware, imageController.changeName)
router.delete('/:id', authMiddleware,  imageController.imageDelete)
router.get('/download/:id', authMiddleware,  imageController.downloadImage)

module.exports = router