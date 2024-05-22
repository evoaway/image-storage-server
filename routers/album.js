const Router = require('express')
const router = new Router()
const albumController = require('../controllers/albumController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware, albumController.getAlbums)
router.get('/:id', authMiddleware, albumController.getAlbumImages)
router.get('/shared/me', authMiddleware, albumController.getSharedWitMe)
router.put('/shared/:id', authMiddleware, albumController.addShared)
router.delete('/shared/:id', authMiddleware, albumController.removeShared)
router.get('/download/:id', authMiddleware, albumController.download)

module.exports = router