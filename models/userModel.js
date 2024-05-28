module.exports = class User {
    constructor(email, password, firstname, lastname, role='user') {
        this.email = email;
        this.hashPassword = password;
        this.firstname = firstname;
        this.lastname = lastname;
        this.role = role;
        this.locked = false
    }
}