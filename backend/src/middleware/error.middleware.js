const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

   const isRawDbError = ['MongoServerError', 'MongoError', 'ValidationError', 'CastError'].includes(err.name);
  const message = isRawDbError
    ? 'A database error occurred while processing your request'
    : err.message || 'Internal Server Error';
    
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorMiddleware;