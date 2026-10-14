import app from './app';

const port = process.env.PORT || 3000;

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server is running on port ${port} at 0.0.0.0`);
});
