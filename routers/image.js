const Router = require('express')
const multer = require("multer");
const path = require('path');
const router = new Router()
const imageController = require('../controllers/imageController')
const authMiddleware = require('../middleware/authMiddleware')
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20000000 }, // 20 MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }}).array('images', 100);

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|tiff|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        return cb(null, false);
    }
}

router.post('/', upload, authMiddleware,  imageController.uploadImages)
router.get('/', authMiddleware,  imageController.search)
router.get('/:id', authMiddleware,  imageController.getImage)
router.patch('/:id', authMiddleware, imageController.changeName)
router.delete('/:id', authMiddleware,  imageController.imageDelete)
router.get('/download/:id', authMiddleware,  imageController.downloadImage)

module.exports = router