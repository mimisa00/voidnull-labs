const { PrismaClient } = require('@prisma/client');
const bcrypt=require('bcrypt');
(async()=>{
 const prisma=new PrismaClient({datasource:{url:'postgresql://voidnull:secret@localhost:5432/voidnull_dev'}});
 const passwordHash=await bcrypt.hash('Admin@123456',10);
 const user=await prisma.user.upsert({ where:{email:'admin@voidnull.io'}, update:{}, create:{email:'admin@voidnull.io',passwordHash, roles:[]}});
 console.log('created',user.id);
 await prisma.$disconnect();
})();