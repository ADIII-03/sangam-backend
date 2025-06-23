import jwt from "jsonwebtoken"
export const generateTokenAndSaveCookie = (res, userId) => {
    
const token = jwt.sign({userId}, process.env.JWT_SECRET, {
    expiresIn: "1d"
})
res.cookie("jwt", token, {
    httpOnly: true, //xss
    secure: process.env.NODE_ENV !== "development",
    sameSite: 'lax', //csrf
    maxAge: 24 * 60 * 60 * 1000
})
}