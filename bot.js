const Eris = require('eris');
const env = process.env;
const fs = require('fs');
const u_wut_m8 = require('./.auth.json');
const DBL = require('dblapi.js');
const request = require('request');
const Logger = require('./functions/logger');
const console = new Logger();
let nums = require('./functions/numbers');
let manager = require('./functions/blacklistManager');
let stats = require('./functions/commandStatistics');
let owners = require('./functions/getOwners');
let prefixes = require('./functions/managePrefixes');
let i = 0;
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://81fb39c6a5904886ba26a90e2a6ea8aa@sentry.io/1407724' });
const dbl = new DBL(u_wut_m8.dblToken, {});
manager.manageBlacklist({action: 'refresh', blklist: 'blk'}).then(list => {
    console.log(`Loaded blacklist. There are currently ${list.users.length} user entry(s), ${list.servers.length} server entry(s), and ${list.channels.length} channel entry(s).`);
}, (err) => {
    console.error(err)
});
manager.manageBlacklist({action: 'refresh', blklist: 'pblk'}).then(list => {
    console.log(`Loaded pasta blacklist. There are currently ${list.servers.length} server entry(s).`);
}, (err) => {
    console.error(err)
});
manager.manageBlacklist({action: 'refresh', blklist: 'gblk'}).then(list => {
    console.log(`Loaded global user blacklist. There are currently ${list.users.length} user entry(s).`);
}, (err) => {
    console.error(err)
});
owners.initializeOwners().then(list => {
    console.log(`Loaded owners. There are currently ${list.users.length} owners.`);
}, (err) => {
    console.error(err)
});
function nextShard() {
    console.log(`Connecting to shard ${i}`);
    const client = new Eris.CommandClient(env.DEBUG ? u_wut_m8.otherToken : u_wut_m8.token, {
        firstShardID: i,
        lastShardID: i,
        maxShards: nums.shardCount,
        getAllUsers: true
    }, {
        description: 'Been hard at work making Dad Bot better and better, you can now toggle auto responses on a per channel basis, and you can also change the prefix, *we still need suggestions for the embarrass and dadjoke commands so use command invite to drop by the server and suggest away!*',
        owner: 'AlekEagle#0001',
        prefix: env.DEBUG ? 'test!' : 'd!'
    });
    function onDBLVote(data) {
        client.getDMChannel(data.user).then(msg => {
            msg.createMessage("Oh hecc you voted! Thanks! This helps me a lot!").catch(() => {});
        }, () => {
            console.error('Unable to DM user')
        });
    }
    if (i < nums.shardCount && !env.DEBUG) request.post(`https://maker.ifttt.com/trigger/process_started/with/key/${u_wut_m8.iftttToken}`,{
            json: {
                value1: 'Dad Bot',
                value2: i.toString()
            }
        }, () => {
            console.log(`Told IFTTT that shard ${i} started`);
    });
    client.on('ready', () => {
        prefixes.managePrefixes({action: 'refresh', client}).then(prefixes => {
            console.log(`Loaded ${prefixes.length} guild prefix(es).`)
        });
        prefixes.on('newPrefix', (id, prefix) => client.registerGuildPrefix(id, prefix));
        prefixes.on('removePrefix', (id) => {
            delete client.guildPrefixes[id];
        });
        prefixes.on('updatePrefix', (id, prefix) => {
            client.guildPrefixes[id] = prefix;
        });
        console.log(`Connected to shard ${i}`);
        if (i < nums.shardCount) {
            let http = require('http'),
                app = require('express')(),
                server = http.createServer(app);
            app.get('/servers', (req, res) => {
                res.statusCode = 200;
                res.end(client.guilds.size.toString())
            })
            app.post('/vote', (req, res) => {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    body = JSON.parse(body)
                    if (body.type === 'test') {
                        console.log(body)
                        onDBLVote(body)
                    }else {
                        onDBLVote(body)
                    }
                    res.end('{"success":"true"}')
                })
            })
            app.get('/reloadcmds', (req, res) => {
                Object.values(client.commands).map(c => c.label).filter(c => c !== 'help').forEach(c => {
                    client.unregisterCommand(c);
                });
                var commands = fs.readdirSync('./cmds');
                console.log(`Loading ${commands.length} commands, please wait...`)
                commands.forEach(c => {
                    delete require.cache[require.resolve(`./cmds/${c}`)]
                    var cmdFile = require(`./cmds/${c}`);
                    stats.initializeCommand(cmdFile.name);
                    client.registerCommand(cmdFile.name, (msg, args) => cmdFile.exec(client, msg, args, nums.shardCount), cmdFile.options)
                });
                res.end('{ "success": true }')
            });
            app.get('/reloadevts', (req, res) => {
                client.eventNames().forEach(e => {
                    if (e !== 'ready') {
                        var eventlisteners = client.rawListeners(e);
                        if (e === 'messageReactionAdd' || e === 'messageReactionRemove' || e === 'messageCreate') {
                            eventlisteners = eventlisteners.slice(1);
                        }
                        eventlisteners.forEach(ev => {
                            client.removeListener(e, ev);
                        })
                        
                    }
                });
                var events = fs.readdirSync('./events');
                console.log(`Loading ${events.length} events, please wait...`);
                events.forEach(e => {
                    delete require.cache[require.resolve(`./events/${e}`)];
                    var eventFile = require(`./events/${e}`);
                    client.on(eventFile.name, (...args) => {
                        eventFile.exec(client, ...args);
                    });
                });
            });
            app.post('/eval', (req, res) => {
                let nums = require('./functions/numbers');
                let manager = require('./functions/blacklistManager');
                let owners = require('./functions/getOwners');
                let util = require('util');
                let guildCount = require('./functions/getGuilds');
                let prefixes = require('./functions/managePrefixes');
                let toHHMMSS = require('./functions/toReadableTime');
                let genRanString = require('./functions/genRanString');
                let stats = require('./functions/commandStatistics');
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        let evaluation = eval(body);
                        if (typeof evaluation !== "string") {
                            evaluation = util.inspect(evaluation).replace(client.token, '(insert token here)')
                        }else {
                            evaluation = evaluation.replace(client.token, '(insert token here)')
                        }
                        if (evaluation.length > 2000) {
                            fs.writeFile('/home/pi/node_server/root/dad_bot/eval_out/eval_output.txt', evaluation.replace(/\n/g, '<br>'), (err) => {
                                if (err != undefined) {
                                    res.end('An error occurred while this action was being preformed error code: `' + err.code + '`')
                                }
                            });
                            res.end('Output too large, it should be on your website at https://alekeagle.tk/dad_bot/eval_out')
                        }else {
                            res.end(evaluation)
                        }
                    } catch (err) {
                        res.end('OOF ERROR:\ninput: ```' + evalCommand + '``` output: ```' + err + '```')
                    }
                })
            })
            server.listen(parseInt(`420${i}`))
        }
        if (i < nums.shardCount && !env.DEBUG) {
            request.post(`https://maker.ifttt.com/trigger/bot_restarted/with/key/${u_wut_m8.iftttToken}`,{
                json: {
                    value1: 'Dad Bot',
                    value2: client.options.firstShardID.toString()
                }
            }, () => {
                console.log(`Told IFTTT that shard ${client.options.firstShardID} connected`);
            });
        }else if (!env.DEBUG) {
            request.post(`https://maker.ifttt.com/trigger/bot_reconnected/with/key/${u_wut_m8.iftttToken}`,{
                json: {
                    value1: 'Dad Bot',
                    value2: client.options.firstShardID.toString()
                }
            }, () => {
                console.log(`Told IFTTT that shard ${client.options.firstShardID} reconnected`);
            });
        }
        client.editStatus('online', {
            type: 0,
            name: `try ${client.commandOptions.prefix}help`
        });
        if (!env.DEBUG) {
            setInterval(() => {
                dbl.postStats(client.guilds.size, client.options.firstShardID, nums.shardCount);
            }, 300000);
            dbl.postStats(client.guilds.size, client.options.firstShardID, nums.shardCount);
        }
        if (i < nums.shardCount) {
            i ++
            if (i < nums.shardCount) nextShard()
        }
    });
    var events = fs.readdirSync('./events');
    console.log(`Loading ${events.length} events, please wait...`)
    events.forEach(e => {
        var eventFile = require(`./events/${e}`);
        client.on(eventFile.name, (...args) => {
            eventFile.exec(client, ...args)
        })
    })
    var commands = fs.readdirSync('./cmds');
    console.log(`Loading ${commands.length} commands, please wait...`)
    commands.forEach(c => {
        var cmdFile = require(`./cmds/${c}`);
        stats.initializeCommand(cmdFile.name);
        client.registerCommand(cmdFile.name, (msg, args) => cmdFile.exec(client, msg, args), cmdFile.options)
    })
    client.registerGuildPrefix('264445053596991498', 'daddy?')
    client.registerGuildPrefix('110373943822540800', 'daddy?')
    client.registerGuildPrefix('374071874222686211', 'daddy?')
    client.registerGuildPrefix('396440418507816960', 'daddy?')
    client.registerGuildPrefix('450100127256936458', 'daddy?')
    client.registerGuildPrefix('454933217666007052', 'daddy?')
    client.registerGuildPrefix('446425626988249089', 'daddy?')
    client.registerGuildPrefix('581542195547602950', '+')
    client.connect();
}
nextShard();