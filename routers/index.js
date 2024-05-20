const Router = require('express')
const router = new Router()
const imageRouter = require('./image')
const userRouter = require('./user')
const albumRouter = require('./album')

router.use('/image', imageRouter)
router.use('/user', userRouter)
router.use('/album', albumRouter)

module.exports = router