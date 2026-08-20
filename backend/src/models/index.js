// Central model registry. Requiring this file (once, at app startup)
// ensures every schema is registered with Mongoose via mongoose.model(name, schema)
// BEFORE any controller tries to look models up by name with mongoose.model(name).
require('./CitizenRequest');
require('./Demographic');
require('./Infrastructure');
require('./Investment');
require('./PriorityResult');