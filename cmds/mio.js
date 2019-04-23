'use strict';

let manager = require('../functions/blacklistManager');
let lists = require('../functions/lists');
let stats = require('../functions/commandStatistics');

module.exports = {
    name: 'mio',

    exec: (client, msg, args) => {
        stats.updateUses(module.exports.name);
        if (!manager.gblacklist.users.includes(msg.author.id)) {
            msg.channel.createMessage({
                embed: {
                    image: {
                        url: lists.mio[Math.floor(Math.random() * lists.mio.length)]
                    }
                }
            }).catch(() => {});
        } else {
            msg.author.getDMChannel().then(chn => {
                chn.createMessage('You have been blacklisted from dad bot! If you think this is a mistake, please go here https://alekeagle.tk/discord and ask AlekEagle#0001 about this issue.').catch(() => {
                    msg.channel.createMessage(`<@${msg.author.id}> You have been blacklisted from dad bot! If you think this is a mistake, please go here https://alekeagle.tk/discord and ask AlekEagle#0001 about this issue.`)
                })
            })
        }
    },

    options: {
        description: 'Just mio'
    }
}