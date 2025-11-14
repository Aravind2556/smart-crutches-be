const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    id: {type: Number, required: true, trim: true},
    fullname: { type: String, required: true, trim: true },  
    email: { type: String, required: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },  
    contact: { type: Number, required: true, validate: { validator: v => /^\d{10}$/.test(v), message: 'Contact must be a 10-digit number.' } },  
    role: {type: String, enum: ['admin', 'user'], required: true, default: 'user'},
    password: {type: String, required: true}
})

const userModel = mongoose.model('san-ats-v1-user', userSchema)

module.exports = userModel