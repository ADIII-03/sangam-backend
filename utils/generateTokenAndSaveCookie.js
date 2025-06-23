import jwt from "jsonwebtoken"
export const generateTokenAndSaveCookie = (res, userId) => {
    
const token = jwt.sign({userId}, process.env.JWT_SECRET, {
    expiresIn: "1d"
})
res.cookie("jwt", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",  // sirf production me true
  sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',  // prod me none, dev me lax
  maxAge: 24 * 60 * 60 * 1000,
});

}