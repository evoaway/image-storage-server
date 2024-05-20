const Router = require('express')
const router = new Router()
const albumController = require('../controllers/albumController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware, albumController.getAlbums)
router.get('/:id', authMiddleware, albumController.getAlbumImages)
router.put('/shared/:id', authMiddleware, albumController.addShared)
router.delete('/shared/:id', authMiddleware, albumController.removeShared)

module.exports = router