import { dbConnect } from "@/lib/dbConnector";
import bcrypt from "bcryptjs";
import UserModel from "@/model/user.model";
import mongoose, { Schema, Document } from "mongoose";
import { sendVerificationEmail } from "@/helpers/sendVerification";

export async function POST(request:Request){
    await dbConnect()

    try {
        const{username, email,password}=await request.json()
        const existingUserVerifiedByUsername =await 
        UserModel.findOne({
            username,
            isVerified:true 
        })

        if(existingUserVerifiedByUsername){
            return Response.json({
                success:false,
                message:'Username already taken'
            },
            {
                status:400
            })
        }
        const existingUserVerifiedByEmail =await
        UserModel.findOne({email})

        const verifyCode=Math.floor(100000+Math.random()*900000).toString()


        if(existingUserVerifiedByEmail){
            if(existingUserVerifiedByEmail.isVerified){
                return Response.json(
                    {
                        success:false,
                        message:'User already exits with this email'
                    },
                    {
                        status:500
                    }
                )
            }else{
                const hashedPass =await bcrypt.hash(password,10)
                existingUserVerifiedByEmail.password=hashedPass
                existingUserVerifiedByEmail.verifyCode=verifyCode
                existingUserVerifiedByEmail.verifiedCodeExpiry=new Date(Date.now()+3600000)
                await existingUserVerifiedByEmail.save()
            }
        }else{
            const hashedPass= await bcrypt.hash(password,10)

            const expiryDate =new Date()
            expiryDate.setDate(expiryDate.getDate()+1)

           const newUser= new UserModel({
                username,
                email,
                password:hashedPass,
                verifyCode,
                verifiedCodeExpiry:expiryDate,
                isVerified:false,
                isAcceptingMessage:true,
                messages:[],
                bankDetails: null,
            })
            await newUser.save()
        }

        //send verification code

        const emailResponse =await sendVerificationEmail(email,username,verifyCode)
        console.log('emailResponse:',emailResponse)
        if(emailResponse.success){
            return Response.json(
                {
                    success:true,
                    message:'verification code sent successfully'
                },
                {
                    status:200
                }
            )
        }

        if(!emailResponse.success){
            return Response.json(
                {
                    success:false,
                    message:emailResponse.message
                },
                {
                    status:500
                }
            )
        }
        return Response.json(
            {
                success:true,
                message:'user registred successfully'
            },
            {
                status:200
            }
        )
  
    } catch (error) {
        console.error('Error registering user', error)
        return Response.json(
            {   
                success:false,
                message: 'Error registering user'
            },
            {
                status: 500
            }
        )
    }
}