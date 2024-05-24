module.exports = class User {
    constructor(email, password, firstname, lastname) {
        this.email = email;
        this.hashPassword = password;
        this.firstname = firstname;
        this.lastname = lastname;
    }
}