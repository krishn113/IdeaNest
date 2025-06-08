import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config'
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from "firebase-admin";
import { getAuth} from "firebase-admin/auth";
import aws from "aws-sdk";
//Schemas 
import User from './Schema/User.js';
import Blog from './Schema/Blog.js';



const server = express();
let PORT = 3000;

// admin.initializeApp({
//     credential:admin.credential.cert(serviceAccountKey)
// })

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());
server.use(cors())

mongoose.connect(process.env.DB_LOCATION , {
    autoIndex: true
})

//setting up s3 bucket
const s3=new aws.S3({
    region:'mumbai',
    accessKeyId:process.env.AWS_ACCESS_KEY,
    secretAccessKey:process.env.SECRET_ACCESS_KEY
})

const generateUploadURL=async ()=>{
    const date=new Date();
    const imageName=`${nanoid()}-${date.getTime()}.jpeg`;
    return await s3.getSignedUrlPromise('putObject',{
        Bucket:'',
        Key:imageName,
        Expires:1000,
        ContentType:"image/jpeg"
    })
}

const verifyJWT=(req,res,next)=>{
    const authHeader=req.headers['authorization'];
    const token=authHeader&&authHeader.split(" ")[1];
    if (token==null){
        return res.status(401).json({error: "No access token"})

    }
    jwt.verify(token,process.env.SECRET_ACCESS_KEY,(err,user)=>{
        if (err){
            return res.status(403).json({error:"Access token is invalid"})
        }
        req.user=user.id
        next()
    })
}
const formatDatatoSend = (user) => {
    const access_token = jwt.sign({id: user._id}, process.env.SECRET_ACCESS_KEY)
    return{
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    }
}

const generateUsername = async(email) => {
    let username = email.split("@")[0];

    let isUsernamenotUnique = await User.exists({"personal_info.username": username}).then((result) => result)

    isUsernamenotUnique ? username += nanoid().substring(0, 5) : "";

    return username

}
//ipload image url root
server.get('/get-upload-url',(req,res)=>{
    generateUploadURL().then(url=>res.status(200).json({uploadURL:url}))
    .catch(err=>{
        console.log(err.message);
        return res.status(500).json({error:err.message})
    })
})

server.post("/signup", (req, res) => {
    
    let {fullname, email, password} = req.body;

    //validating the data from the frontend
    if(fullname.length < 3){
        return res.status(403).json({"error" : "Fullname must be atleast 3 letters long"})
    }
    if(!email.length){
        return res.status(403).json({"error":"Enter Email"})
    }
    if(!emailRegex.test(email)){
        return res.status(403).json({"error":"Invalid Email"})
    }

    if(!passwordRegex.test(password)){
        return res.status(403).json({"error":"Password should be 6 to 20 character ling with a numeric, 1 lowercase and 1 uppercase letters"})
    }

    bcrypt.hash(password, 10, async (error, hashed_password)=>{
        let username = await generateUsername(email);

        let user = new User({
            personal_info: {fullname, email, password: hashed_password, username}
        })

        user.save().then((u) => {
            return res.status(200).json(formatDatatoSend(u))
        })
        .catch(err => {

            if(err.code == 11000){
                return res.status(500).json({"error" : "Already Exists"})
            }

            return res.status(500).json({"error": err.message})
        })

    })

})

server.post("/signin", (req,res) => {
    let {email, password} = req.body;

    User.findOne({"personal_info.email": email})
    .then((user)=>{
        if(!user){
            return res.status(403).json({"error" : "Email not found"})
        }

        bcrypt.compare(password, user.personal_info.password, (err, result)=> {
            if(err){
                return res.status(403).json({"error": "Error occured while login please try again"})
            }

            if(!result){
                return res.status(403).json({"error": "Incorrect Password"})
            }else{
                return res.status(200).json(formatDatatoSend(user))
            }
        })
        
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({"error" : err.message})
    })
})

server.post('/latest-blogs', (req, res) => {

    let {page} = req.body;
    let maxLimit = 1;

    Blog.find({ draft: false })
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ publishedAt: -1 })
        .select("blog_id title des banner activity tags publishedAt -_id")
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post("/all-latest-blogs-count", (req, res) => {
  Blog.countDocuments({ draft: false })
    .then(count => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch(err => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});


server.get('/trending-blogs', (req, res)=>{
    let maxLimit = 5;
    Blog.find({draft: false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"activity.total_reads": -1, "activity.total_likes" : -1, "publishedAt" : -1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .limit(maxLimit)
    .then(blogs => {
        return res.status(200).json({blogs})
    })
    .catch(err => {
        return res.status(500).json({error: err.message})
    })
})

server.post("/search-blogs-count", (req, res) => {


    let { tag, author, query} = req.body;
    let findQuery;

    if(tag){
        findQuery = {tags: tag, draft: false};
    }else if(query){
        findQuery = { draft: false, title: new RegExp(query, 'i') };
    }else if(author){
        findQuery = {author, draft: false}
    }

    Blog.countDocuments(findQuery)
    .then(count => {
        return res.status(200).json({ totalDocs: count });
    })
    .catch(err => {
        console.log(err.message);
        return res.status(500).json({ error: err.message });
    });
});

server.post('/search-blogs', (req, res) =>{

    let { tag , author, query, page} = req.body;

    let findQuery;

    if(tag){
        findQuery = {tags: tag, draft: false};
    }else if(query){
        findQuery = { draft: false, title: new RegExp(query, 'i') };
    }else if(author){
        findQuery = {author, draft: false}
    }

    let maxLimit = 1;

    Blog.find(findQuery)
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then(blogs => {
        return res.status(200).json({ blogs });
    })
    .catch(err => {
        return res.status(500).json({ error: err.message });
    });
})

server.post('/get-profile', (req,res) => {
    let {username} = req.body;

    User.findOne({"personal_info.username" : username})
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then(user => {
        return res.status(200).json(user)
    })
    .catch(err =>{
        console.log(err);
        return res.status(500).json({ error: err.message });
    })
})

server.post('/create-blog',verifyJWT,(req,res)=>{
    let authorId=req.user;
    let { title,des,banner,tags,content,draft}=req.body;
    if(!title.length){
        return res.status(403).json({error:"You must provide a title "})
    }
    if(!draft){
        if (!des.length||des.length>200){
        return res.status(403).json({error: "You must provide blog description under 200 characters"})

    }
    if (!banner.length){
        return res.status(403).json({error:"You must provide blog banner to publish the blog"})
    }
    if (content.blocks.length){
        return res.status(403).json({error:"There must be some blog content to publish the blog"})

    }
    if (!tags.length||tags.length>10){
        return res.status(403).json({error: "Provide tags in the order to publish it"})
    }
    }
    
    

    tags=tags.map(tag=>tag.toLowerCase());
    let blog_id=title.replace(/[^a-zA-Z0-9]/g, '').replace(/\s+/g,"-").trim()+nanoid();
    let blog=new Blog({
        title,des,banner,content,tags,author:authorId,blog_id,draft:Boolean(draft)
    })

    blog.save().then(blog=>{
        let incrementVal=draft?0:1;
        User.findOneAndUpdate({_id:authorId},{$inc:{"account_info.total_posts":incrementVal},$push:{
            "blogs":blog._id
        }})
        .then(user=>{
            return res.status(200).json({id:blog.blog_id})
        })
        .catch(err=>{
            return res.status(500).json({error:"Failed to update total number of posts"})
        })
    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })

    return res.json({status:'done'})
})

server.listen(PORT, () => {
    console.log('listening on port --> ' + PORT)
})

