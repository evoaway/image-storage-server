const Router = require('express')
const router = new Router()
const albumController = require('../controllers/albumController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware, albumController.getAlbums)
router.get('/:id', authMiddleware, albumController.getAlbumImages)
router.delete('/:id', authMiddleware, albumController.delete)
router.get('/share/me', authMiddleware, albumController.getSharedWitMe)
router.get('/shared/:id', authMiddleware, albumController.getSharedUsers)
router.put('/shared/:id', authMiddleware, albumController.addShared)
router.delete('/shared/:id', authMiddleware, albumController.removeShared)
router.get('/download/:id', authMiddleware, albumController.download)

module.exports = router