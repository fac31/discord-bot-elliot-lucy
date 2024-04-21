const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    description: { 
        type: String, 
        required: true 
    },
    assignee: { 
        type: String, 
        required: true 
    },
    deadline: { 
        type: String, 
        required: false 
    },
    completed: {
        type: Boolean, 
        default: false 
    }
});

module.exports = mongoose.model('Task Data',taskSchema)