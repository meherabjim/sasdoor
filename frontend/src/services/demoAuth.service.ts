export type DemoUser = {
  name:string;
  email:string;
  phone:string;
  password:string;
  role:"USER"|"ADMIN"|"SUPERADMIN";
};


let demoUsers:DemoUser[] = [

{
name:"Demo User",
email:"user@sasdoor.com",
phone:"01700000000",
password:"123456",
role:"USER"
},

{
name:"Admin User",
email:"admin@sasdoor.com",
phone:"01800000000",
password:"123456",
role:"ADMIN"
},

{
name:"Super Admin",
email:"super@sasdoor.com",
phone:"01900000000",
password:"123456",
role:"SUPERADMIN"
}

];


export function demoLogin(
email:string,
password:string
){

const user = demoUsers.find(
u =>
(u.email===email || u.phone===email)
&&
u.password===password
);


if(!user){
throw new Error("Invalid email or password");
}


return {
accessToken:"demo-token",
user
};

}



export function checkAccount(
value:string
){

return demoUsers.find(
u =>
u.email===value ||
u.phone===value
);

}



export function verifyDemoOTP(
otp:string
){

return otp==="1234";

}



export function updateDemoPassword(
email:string,
password:string
){

const user =
demoUsers.find(
u=>u.email===email
);


if(user){
user.password=password;
}

return user;

}
