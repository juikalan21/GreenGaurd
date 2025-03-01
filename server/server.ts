import express, {Request,Response} from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
    res.send('Green Guard Server initiate start');
});

app.listen(5000, () => {
  console.log('Green Guard Server is running on port 5000');
})