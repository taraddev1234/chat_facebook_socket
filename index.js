const fb = {
  // accessToken:'113987922484379|DrMxesMKgQjmc0zM-9sYZYBgXaM',
  accessToken:'1021521108034699|J2g_nzDQbCc2RICVlCokPAl40Ro',
  verifyToken:'tarad1234',
  appSecret:'5dd5334bac4fe4fc864f16361c69bab6'
}
const express = require('express')
const app = express()
const cors = require('cors')
const http = require('http').Server(app)
const io = require('socket.io')(http)
const bodyParser = require('body-parser')
const bootBot = require('./lib/BootBot')
const bot = new bootBot(fb)
io.set('origins', '*')
// io.origins(['https://dev-backoffice.tarad.com', 'https://new-backoffice.tarad.com'])
io.on('connection',function(socket){
    socket.on('initpage',function(pageid){
      console.log('page admin initialize'+pageid)
      socket.join(pageid)
    }) 
    socket.on('pageSendMessage',function(msg,data){
      console.log(msg)
      bot.sendTextMessage(msg.pagetoken,msg.recipientID,msg.msg)
    })
})
//instance setting 
app.use(cors())
app.use(bodyParser.json({ verify:bot._verifyRequestSignature.bind(bot) }));     
//messenger entry point/handshake
app.get('/messenger/webhook',(req, res)=>{
    console.log(req.query)
    console.log('hit web hook')
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === fb.verifyToken) {
      console.log('Validation Succeded.')
      res.status(200).send(req.query['hub.challenge']);
    } else {
      res.send('failed'+req.query['hub.mode']+' '+req.query['hub.verify_token'] +' === '+ fb.verifyToken
      console.error('Failed validation. Make sure the validation tokens match.');
      res.sendStatus(403)
    }
})
app.post('/messenger/webhook', (req, res) => {
    var data = req.body;
    if (data.object !== 'page') {
      return
    }
    data.entry.forEach((entry) => {
      if(entry.messaging){
            entry.messaging.forEach((event) => {
                if (event.message && event.message.is_echo && !bot.broadcastEchoes) {
                  return;
                }
                if (event.optin) {
                  bot._handleEvent('authentication', event);
                } else if (event.message && event.message.text) {
                  bot._handleMessageEvent(event);
                  if (event.message.quick_reply) {
                    bot._handleQuickReplyEvent(event);
                  }
                } else if (event.message && event.message.attachments) {
                  bot._handleAttachmentEvent(event);
                } else if (event.postback) {
                  bot._handlePostbackEvent(event);
                } else if (event.delivery) {
                  bot._handleEvent('delivery', event);
                } else if (event.read) {
                  bot._handleEvent('read', event);
                } else if (event.account_linking) {
                  bot._handleEvent('account_linking', event);
                } else if (event.referral) {
                  bot._handleEvent('referral', event);
                } else {
                  console.log('Webhook received unknown event: ', event);
                }
            });
      }else if(entry.changes){
                entry.changes.forEach((data)=>{
                    if(data.field==='feed'){
                      bot._handleFeed(data.value)
                    }
                });
      }
    })
    res.sendStatus(200);
})
//bot instance 
bot.on('message',(payload) => {
   console.log('on message')
   console.log(payload)
   let pageid = payload.recipient.id
   io.to(pageid).emit('usersendmessage',payload)
})
bot.on('attachment',(payload)=>{
    console.log('on attachment')  
    console.log(payload)
    let pageid = payload.recipient.id
    io.to(pageid).emit('usersendattachment',payload)
})
bot.on('delivery',(payload)=>{
    console.log('hit delivery')
    console.log(payload)
})
http.listen(process.env.PORT || 3000)















