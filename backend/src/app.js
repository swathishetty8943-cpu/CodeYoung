const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const app = express();

// Render terminates TLS at its edge proxy and forwards plain HTTP to the
// app, so without this Express thinks every request is insecure. That
// doesn't affect the hard-coded `secure: true` cookie flag above, but it
// does matter for anything else that inspects req.protocol/req.secure.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: [env.FRONTEND_URL, env.ADMIN_FRONTEND_URL],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

// Anything else under /api is an unknown route.
app.use('/api', (req, res, next) => next(ApiError.notFound(`No route: ${req.method} ${req.originalUrl}`)));

// Centralized error handler - must be registered last.
app.use(errorHandler);

module.exports = app;
