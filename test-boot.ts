import('./server.ts').then(() => {
  console.log("Server module loaded successfully");
  process.exit(0);
}).catch(err => {
  console.error("SERVER LOAD ERROR", err);
  process.exit(1);
});
