module.exports = class Album {
    constructor(className, images, userId, userEmail, sharedWith) {
        this.className = className;
        this.images = images;
        this.userId = userId;
        this.userEmail = userEmail;
        this.sharedWith = sharedWith;
    }
}