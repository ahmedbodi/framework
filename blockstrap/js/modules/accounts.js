/*
 * 
 *  Blockstrap v0.6.0.0
 *  http://blockstrap.com
 *
 *  Designed, Developed and Maintained by Neuroware.io Inc
 *  All Work Released Under MIT License
 *  
 */

(function($) 
{
    var accounts = {};
    
    accounts.access = function(account_id, tx, chain)
    {
        var fields = [];
        var account = accounts.get(account_id, true);
        var is_tx = false;
        if($.isPlainObject(tx) && tx.to && tx.from && tx.amount)
        {
            is_tx = true;
        }
        var keys = account.keys;
        if(
            typeof account.blockchains != 'undefined'
            && typeof account.blockchains[chain] != 'undefined'
        ){
            account = account.blockchains[chain];
            account.keys = keys;
        }
        if($.isArray(account.keys))
        {
            $.each(account.keys, function(k, v)
            {
                var group_css = '';   
                var type = 'text';
                var key_array = v.split('_');
                var this_key = key_array[1];
                var value = account[this_key];
                // TODO: HARD-CODED FIX THAT SHOULD BE DEALT WITH BY PATCH?
                if(this_key == 'blockchain' || this_key == 'currency')
                {
                    value = account.code;
                    type = 'hidden';
                    group_css = 'hidden';
                }
                if(this_key == 'password')
                {
                    type = 'password';
                    value = '';
                }
                else if(account[this_key])
                {
                    type = 'hidden';
                    group_css = 'hidden';
                }
                fields.push({
                    css: group_css,
                    inputs: {
                        id: v,
                        type: type,
                        label: {
                            css: 'col-xs-3',
                            text: blockstrap_functions.unslug(this_key)
                        },
                        wrapper: {
                            css: 'col-xs-9'
                        },
                        value: value
                    }
                });
            })
        }
        if(is_tx === true)
        {
            fields.push({
                inputs: {
                    id: 'msg',
                    type: 'text',
                    label: {
                        css: 'col-xs-3',
                        text: 'OP_Return'
                    },
                    wrapper: {
                        css: 'col-xs-9'
                    },
                    placeholder: 'Optional Message to Encode on Chain'
                }
            });
        }
        var options = {
            css: 'form-horizontal',
            objects: [
                {
                    id: 'verify-ownership',
                    fields: fields
                }
            ],
            buttons: {
                forms: [
                    {
                        id: 'cancel-verification',
                        css: 'btn-danger pull-right btn-split',
                        text: 'Cancel',
                        type: 'button',
                        attributes: [
                            {
                                key: 'data-dismiss',
                                value: 'modal'
                            }
                        ]
                    },
                    {
                        type: "submit",
                        id: "submit-verification",
                        css: 'btn-primary pull-right btn-split',
                        text: 'Submit',
                        attributes: [
                            {
                                key: 'data-account-id',
                                value: account_id
                            },
                            {
                                key: 'data-chain',
                                value: chain
                            },
                            {
                                key: 'data-form-id',
                                value: 'verify-ownership'
                            }
                        ]
                    }
                ]
            }
        };
        var intro = '';
        if(is_tx === true)
        {
            options.buttons.forms[1].id = 'submit-payment';
            options.buttons.forms[1].attributes.push({
                key: 'data-to-address',
                value: tx.to
            });
            options.buttons.forms[1].attributes.push({
                key: 'data-from-address',
                value: tx.from
            });
            options.buttons.forms[1].attributes.push({
                key: 'data-to-amount',
                value: tx.amount
            });
            options.buttons.forms[1].attributes.push({
                key: 'data-to-blockchain',
                value: account.code
            });
            var amount = parseInt(tx.amount) / 100000000;
            var fee = $.fn.blockstrap.settings.blockchains[account.code].fee;
            amount = amount + ' ' + account.type;
            intro = '<p class="left">Please confirm you want to send ' + amount + ' to ' + tx.to + '</p><p>Please also note that there is a network mining fee of ' + fee + ' ' + account.type + ' applied to this transaction to ensure that it is propergated throughout the network quickly.</p>';
        }
        var form = $.fn.blockstrap.forms.process(options);
        $.fn.blockstrap.core.modal('Verify Ownership of ' + account.name, intro + form);
    }
    
    accounts.address = function(key, account_id)
    {
        var accounts = [];
        var address = false;
        if(account_id) accounts.push($.fn.blockstrap.accounts.get(account_id));
        else accounts = $.fn.blockstrap.accounts.get();
        if($.isArray(accounts))
        {
            $.each(accounts, function(k, account)
            {
                if(account.address == key)
                {
                    address = account;
                }
            });
        }
        return address;
    }
    
    accounts.balances = function()
    {
        var balances = {};
        var accounts = $.fn.blockstrap.accounts.get();
        if($.isArray(accounts))
        {
            $.each(accounts, function(k, v)
            {
                $.each(v.blockchains, function(k, v)
                {
                    var balance = 0;
                    if(v.balance) balance = parseInt(v.balance);
                    if(balances[v.code])
                    {
                        balances[v.code].balance = parseInt(balances[v.code].balance) + balance;
                        balances[v.code].count++;
                        balances[v.code].name = v.type;
                    }
                    else
                    {
                        balances[v.code] = {};
                        balances[v.code].balance = parseInt(balance);
                        balances[v.code].count = 1;
                        balances[v.code].name = v.type;
                    }
                });
            });
            $.each(balances, function(blockchain, obj)
            {
                var this_balance = balances[blockchain].balance;
                balances[blockchain].balance = parseInt(this_balance) / 100000000;
            });
            return balances;
        }
    }
    
    accounts.get = function(id, raw)
    {
        var accounts = false;
        var usd_rates = $.fn.blockstrap.settings.exchange.usd;
        if(typeof raw == 'undefined') raw = false;
        else raw = true;
        if(localStorage)
        {
            if(id && localStorage.getItem('nw_accounts_'+id))
            {
                var this_account = localStorage.getItem('nw_accounts_'+id);
                if(blockstrap_functions.json(this_account)) this_account = $.parseJSON(this_account);
                var tx_total = 0;
                var usd_total = 0;
                $.each(this_account.blockchains, function(chain, obj)
                {
                    if(typeof usd_rates[chain] == 'undefined') usd_rates[chain] = 0;
                    usd_total = usd_total + (usd_rates[chain] * this_account.blockchains[chain].balance);
                    this_account.usd_total = usd_total;
                    tx_total = tx_total + this_account.blockchains[chain].tx_count;
                    this_account.tx_total = tx_total;
                    this_account.blockchains[chain].id = this_account.id;
                    this_account.blockchains[chain].name = this_account.name;
                    this_account.blockchains[chain].display_balance = parseFloat(this_account.blockchains[chain].balance / 100000000).toFixed(8);
                });
                this_account.usd_total = parseFloat(this_account.usd_total / 100000000).toFixed(2);
                if(raw) return this_account;
                else return this_account.blockchains;
            }
            else
            {
                $.each(localStorage, function(key, account)
                {
                    if(key.substring(0, 12) === 'nw_accounts_')
                    {
                        var tx_total = 0;
                        var usd_total = 0;
                        if(!$.isArray(accounts)) accounts = [];
                        if(blockstrap_functions.json(account)) account = $.parseJSON(account);
                        $.each(account.blockchains, function(chain, obj)
                        {
                            if(typeof usd_rates[chain] == 'undefined') usd_rates[chain] = 0;
                            usd_total = usd_total + (usd_rates[chain] * account.blockchains[chain].balance);
                            account.usd_total = usd_total;
                            tx_total = tx_total + account.blockchains[chain].tx_count;
                            account.tx_total = tx_total;
                            account.blockchains[chain].id = account.id;
                            account.blockchains[chain].name = account.name;
                            account.blockchains[chain].display_balance = parseFloat(account.blockchains[chain].balance / 100000000).toFixed(8);
                        });
                        account.usd_total = parseFloat(account.usd_total / 100000000).toFixed(2);
                        accounts.push(account);
                    }
                });
            }
            return accounts;
        }
    }
    
    accounts.new = function(blockchain, name, password, keys, callback, existing_account)
    {
        if(blockchain && name && password && keys && callback && ($.isArray(blockchain) || $.isPlainObject($.fn.blockstrap.settings.blockchains[blockchain])))
        {
            var key = '';
            var slug = blockstrap_functions.slug(name);
            $.fn.blockstrap.data.find('blockstrap', 'salt', function(salt)
            {
                if(!salt)
                {
                    $.fn.blockstrap.core.loader('close');
                    $.fn.blockstrap.core.modal('Error', 'No salt set for this device');
                }
                else
                {
                    $.fn.blockstrap.data.find('accounts', slug, function(account)
                    {
                        if(account && typeof existing_account == 'undefined')
                        {
                            $.fn.blockstrap.core.loader('close');
                            $.fn.blockstrap.core.modal('Warning', 'This account already exists');
                        }
                        else
                        {
                            var type = 'single';
                            var data = false;
                            if($.isArray(blockchain)) type = 'hd';
                            if($.isPlainObject(keys))
                            {
                                if(keys.wallet_question)
                                {
                                    if(!$.isPlainObject(data)) data = {};
                                    data.wallet_question = keys.wallet_question;
                                }
                                if(keys.wallet_blockchain)
                                {
                                    delete keys.wallet_blockchain;
                                }
                                var values = keys;
                                keys = [];
                                $.each(values, function(k, v)
                                {
                                    keys.push(k);
                                    key_obj = CryptoJS.SHA3(salt+key+k+v, { outputLength: 512 });
                                    key = key_obj.toString();
                                });
                            }
                            else if(keys)
                            {
                                key = keys;
                            }
                            
                            var blockchains = {};
                            var chains = blockchain;
                            var pw_obj = CryptoJS.SHA3(salt+password, { outputLength: 512 });
                            var pw = pw_obj.toString();
                            
                            if(type === 'single')
                            {
                                chains = [];
                                chains.push(blockchain);
                            }
                            $.each(chains, function(k, blockchain)
                            {
                                var address_keys = $.fn.blockstrap.blockchains.keys(key+blockchain, blockchain, 1);
                                var blockchain_name =  $.fn.blockstrap.settings.blockchains[blockchain].blockchain;
                                var address = address_keys.pub;
                                blockchains[blockchain] = {
                                    type: blockchain_name,
                                    address: address,
                                    code: blockchain,
                                    tx_count: 0,
                                    balance: 0,
                                    display_balance: "0.00000000",
                                    ts: 0,
                                    txs: {}
                                };
                            })
                            
                            if(keys == key) keys = false;
                            
                            var account = {
                                id: slug,
                                blockchains: blockchains,
                                name: name,
                                password: pw,
                                keys: keys,
                                tx_total: 0,
                                usd_total: "0.00"
                            };
                            if(data) account.data = data;
                            
                            if(typeof existing_account != 'undefined')
                            {
                                var merged_chains = $.extend(
                                    {}, 
                                    existing_account.blockchains, 
                                    account.blockchains
                                );
                                existing_account.blockchains = merged_chains;
                                slug = existing_account.id;
                                account = existing_account;
                            }
                            $.fn.blockstrap.data.save('accounts', slug, account, function()
                            {
                                var this_account = $.fn.blockstrap.accounts.get(slug, true);
                                $.fn.blockstrap.accounts.update(this_account, function(account)
                                {
                                    if(!account && $.isPlainObject(this_account)) account = this_account;
                                    callback(account);
                                });
                            });
                        }
                    });
                }
            });
        }
        else
        {
            $.fn.blockstrap.core.loader('close');
            if($.isPlainObject($.fn.blockstrap.settings.blockchains[blockchain]))
            {
                $.fn.blockstrap.core.modal('Warning', 'Missing device requirements');
            }
            else
            {
                $.fn.blockstrap.core.modal('Warning', 'Blockchain not supported');
            }
        }
    }
    
    accounts.poll = function(wait, callback)
    {
        var delay = 0;
        var now = new Date().getTime();
        if(
            typeof $.fn.blockstrap.settings.cache != 'undefined'
            && $.fn.blockstrap.settings.cache
            && typeof $.fn.blockstrap.settings.cache.accounts != 'undefined'
        ){
            delay = $.fn.blockstrap.settings.cache.accounts;
        }
        var polls = localStorage.getItem('nw_blockstrap_polls');
        if(blockstrap_functions.json(polls)) polls = $.parseJSON(polls);
        if(!$.isPlainObject(polls)) polls = {};
        if(!polls.accounts) polls.accounts = now;
        if(typeof wait != 'undefined' && wait)
        {
            delay = wait;
        }   
        if(polls.accounts + delay >= now)
        {
            $.fn.blockstrap.accounts.updates(0, function(txs)
            {
                if($.isArray(txs) && blockstrap_functions.array_length(txs) > 0)
                {
                    var title = '1 New Transaction';
                    var content = '<p>A new transaction has taken place.</p>';
                    if(blockstrap_functions.array_length(txs) > 1)
                    {
                        title = blockstrap_functions.array_length(txs) + ' New Transactions';
                        content = '<p>New transactions have taken place.</p>';
                    }
                    if($.isArray(txs))
                    {
                        $.each(txs, function(k, tx)
                        {
                            var value = tx.value;
                            var val = '' + parseInt(tx.value) / 100000000;
                            var blockchain = $.fn.blockstrap.settings.blockchains[tx.blockchain].blockchain;
                            var amount = '<strong>' + val + '</strong> ' + blockchain;
                            var context = amount + ' <strong>recieved</strong>';
                            var base = $.fn.blockstrap.settings.base_url;
                            var url = base + '?txid=' + tx.txid + '#transaction';
                            if(value < 0) context = '<strong>' + val.substring(1) + '</strong> ' + blockchain + ' <strong>sent</strong>';
                            content+= '<p class="break-word">' + context + ':<br /><a href="' + url + '">' + tx.txid + '</a></p>';
                        });
                    }
                    $.fn.blockstrap.core.refresh(function()
                    {
                        $.fn.blockstrap.core.modal(title, content);
                        if(callback) callback();
                    }, $.fn.blockstrap.core.page());
                }
                else
                {
                    if(callback) callback();
                }
            });
        }
        else
        {
            if(callback) callback();
        }
    }
    
    accounts.prepare = function(to, account_id, amount, chain)
    {
        if(to && !$.fn.blockstrap.blockchains.validate(to))
        {
            $.fn.blockstrap.core.modal('Warning', to + ' is not a valid address');
        }
        else if(to && account_id && amount)
        {
            var account = $.fn.blockstrap.accounts.get(account_id, true);
            if(!account)
            {
                $.fn.blockstrap.core.modal('Warning', account_id + ' is not a valid account');
            }
            else
            {
                var tx = {
                    to: to,
                    from: account_id,
                    amount: amount
                };
                $.fn.blockstrap.accounts.access(account_id, tx, chain);
            }
        }
    }
    
    accounts.remove = function(collection, key, element, confirm, chain)
    {
        if(typeof chain == 'undefined') chain = false;
        if(localStorage)
        {
            var item = localStorage.getItem('nw_' + collection + '_' + key);
            if(item && blockstrap_functions.json(item))
            {
                var item_object = $.parseJSON(item);
                var pw = item_object.password;
                var pw_value = $('#confirm-modal #confirm-pw').val();
                var salted = localStorage.getItem('nw_blockstrap_salt');
                var salt = $.parseJSON(salted);
                var password_object = CryptoJS.SHA3(salt+pw_value, { outputLength: 512 });
                var password = password_object.toString();
                if(!confirm || confirm && confirm == password)
                {
                    $('#confirm-modal').modal('hide');
                    
                    if(chain && collection == 'accounts')
                    {
                        // Just remove this one blockchain from account...
                        var raw_account = $.fn.blockstrap.accounts.get(key, true);
                        if(
                            typeof raw_account.blockchains != 'undefined'
                            && typeof raw_account.blockchains[chain] != 'undefined'
                        ){
                            delete raw_account.blockchains[chain];
                        }
                        $.fn.blockstrap.data.save(collection, key, raw_account, function()
                        {
                            $.fn.blockstrap.core.refresh(function()
                            {
                                $.fn.blockstrap.core.loader('close');
                            }, $.fn.blockstrap.core.page());
                        });
                    }
                    else
                    {
                        localStorage.removeItem('nw_' + collection + '_' + key);
                    
                        $($.fn.blockstrap.element).find('#' + element).hide(350, function()
                        {
                            var this_element = $(this);
                            $(this_element).remove();
                            $.fn.blockstrap.core.refresh(function()
                            {
                                $.fn.blockstrap.core.loader('close');
                            }, $.fn.blockstrap.core.page());
                        })
                    }
                }
                else
                {
                    $.fn.blockstrap.core.modal('Warning', 'Incorrect password provided');
                }
            }
            else
            {
                $.fn.blockstrap.core.loader('close');
            }
        }
    }
    
    accounts.total = function(rate, prefix)
    {
        var grand_total = 0;
        var exchange_rates = $.fn.blockstrap.settings.exchange;
        var balances = accounts.balances();
        if($.isPlainObject(balances))
        {
            $.each(balances, function(code, blockchain)
            {
                var total = (parseFloat(blockchain.balance) * 100000000) * parseFloat(exchange_rates[rate][code]);
                grand_total = grand_total + total;
            });
        }
        var new_total = (parseInt(grand_total) / 100000000).toFixed(2);
        if(prefix) return prefix + ' ' + new_total;
        else return new_total;
    }
    
    accounts.tx = function(txid, account_id)
    {
        var accounts = [];
        var transaction = false;
        if(account_id) accounts.push($.fn.blockstrap.accounts.get(account_id));
        else accounts = $.fn.blockstrap.accounts.get();
        if($.isArray(accounts))
        {
            $.each(accounts, function(k, account)
            {
                var txs = account.txs;
                if($.isPlainObject(txs))
                {
                    $.each(txs, function(k, tx)
                    {
                        if(tx.txid == txid)
                        {
                            transaction = tx;
                        }
                    });
                }
            });
        }
        return transaction;
    }
    
    accounts.txs = function(account_id)
    {
        var transactions = [];
        if(account_id) accounts.push($.fn.blockstrap.accounts.get(account_id));
        else accounts = $.fn.blockstrap.accounts.get();
        if($.isArray(accounts))
        {
            $.each(accounts, function(k, account)
            {
                var txs = account.txs;
                if($.isPlainObject(txs))
                {
                    $.each(txs, function(k, tx)
                    {
                        transactions.push(tx);
                    });
                }
            });
        }
        transactions.sort(function(a,b) 
        { 
            return parseFloat(b.time) - parseFloat(a.time) 
        });
        return transactions;
    }
    
    accounts.update = function(account, callback, force_refresh, page, chain)
    {
        if(typeof page == 'undefined') page = 0;
        if(typeof chain == 'undefined') chain = false;
        else page = parseInt(page);
        var usd_rates = $.fn.blockstrap.settings.exchange.usd;
        if($.isPlainObject(account))
        {
            var ts = 0;
            var now = new Date().getTime();
            var cache_time = $.fn.blockstrap.settings.cache.accounts;
            if(account.ts) ts = account.ts;
            if(blockstrap_functions.vars('refresh')) ts = 0;
            if(force_refresh) ts = 0;
            if(typeof cache_time == 'undefined') cache_time = 0;
            if(ts + cache_time < now)
            {
                var chain_count = 0;
                var total_chains = blockstrap_functions.array_length(account.blockchains);
                
                if(chain)
                {
                    $.each(account.blockchains, function(k, temp_chain)
                    {
                        if(k != chain)
                        {
                            delete account.blockchains[k];
                            total_chains = blockstrap_functions.array_length(account.blockchains);
                        }
                    });
                }
                
                $.each(account.blockchains, function(k, chain)
                {
                    var current_balance = chain.balance;
                    var current_tx_count = blockstrap_functions.array_length(chain.txs);
                    $.fn.blockstrap.api.address(chain.address, chain.code, function(results)
                    {
                        chain_count++;
                        if(
                            results.tx_count > 50
                            && $.fn.blockstrap.settings.api_service == 'insight'
                        ){
                            $.fn.blockstrap.core.modal('Warning', 'The insight API Service does not support TX pagination and has a hard limit of 50 transactions, which will cause problems with this ('+results.address+') address.');
                            if(callback) callback(false);
                            else return false;
                        }
                        else if(
                            results.tx_count > 200
                            && $.fn.blockstrap.settings.api_service == 'blockr'
                        ){
                            $.fn.blockstrap.core.modal('Warning', 'The blockr API Service does not support TX pagination and has a hard limit of 200 transactions, which will cause problems with this ('+results.address+') address.');
                            if(callback) callback(false);
                            else return false;
                        }
                        else if(
                            (
                            results.tx_count 
                            && results.tx_count > current_tx_count
                            )
                            ||
                            (
                            results.balance 
                            && results.balance != current_balance
                            )
                        ){
                            chain.balance = results.balance;
                            chain.display_balance = parseFloat(chain.balance / 100000000).toFixed(8);
                            chain.tx_count = results.tx_count;
                            chain.ts = now;
                            
                            account.tx_total = account.tx_total + (chain.tx_count - current_tx_count);
                            account.usd_total = parseFloat(parseFloat(account.usd_total) + parseFloat((usd_rates[chain.code] * chain.balance - current_balance) / 100000000)).toFixed(2);

                            $.fn.blockstrap.api.transactions(
                                chain.address, 
                                chain.code, 
                                function(transactions)
                            {
                                if(!$.isPlainObject(chain.txs)) chain.txs = {};
                                if($.isArray(transactions))
                                {
                                    $.each(transactions, function(k, transaction)
                                    {
                                        chain.txs['txid_'+transaction.txid] = transaction;
                                    });
                                }
                                
                                // TODO: Update account one by one?
                                account.blockchains[k] = chain;
                                
                                if(blockstrap_functions.array_length(chain.txs) < chain.tx_count)
                                {
                                    // Paginate?
                                    page++;
                                    accounts.update(account, callback, force_refresh, page);
                                }
                                else
                                {
                                    if(total_chains <= chain_count)
                                    {
                                        $.fn.blockstrap.data.save('accounts', account.id, account, function(updated_account)
                                        {
                                            if(callback) callback(account);
                                            else return account;
                                        });
                                    }
                                }
                            }, false, false, 25, (page * 25));
                        }
                        else
                        {
                            if(total_chains <= chain_count)
                            {
                                if(callback) callback(false);
                                else return false;
                            }
                        }

                    })
                })
            }
            else
            {
                if(callback) callback(false);
                else return false;
            }
        }
        else
        {
            if(callback) callback(false);
            else return false;
        }
    }
    
    accounts.updates = function(index, callback, old_txs, old_tx_count)
    {
        if(!index) index = 0;
        var accounts = $.fn.blockstrap.accounts.get();
        var account_length = blockstrap_functions.array_length(accounts);
        if($.isArray(accounts))
        {
            var account = accounts[index];
            var current_tx_count = blockstrap_functions.array_length(account.txs);
            index++;
            $.fn.blockstrap.accounts.update(account, function(obj)
            {
                if(typeof old_txs == 'undefined' || !old_txs)
                {
                    var new_txs = [];
                }
                else if($.isArray(old_txs))
                {
                    var new_txs = old_txs;
                }
                if(typeof old_tx_count == 'undefined' || !old_tx_count)
                {
                    var new_tx_count = 0;
                }
                else if(old_tx_count)
                {
                    var new_tx_count = old_tx_count;
                }
                if(obj.tx_count > current_tx_count)
                {
                    new_tx_count = obj.tx_count - current_tx_count;
                    if($.isPlainObject(obj.txs))
                    {
                        $.each(obj.txs, function(key, tx)
                        {
                            new_txs.push(tx);
                            account.txs['txid_'+tx.txid] = tx;
                        });
                    }
                    new_txs.sort(function(a,b) 
                    { 
                        return parseFloat(b.time) + parseFloat(a.time) 
                    });
                }
                if(index >= account_length)
                {
                    $.fn.blockstrap.data.save('accounts', account.id, account, function()
                    {
                        if(callback) callback(new_txs.slice(0, new_tx_count));
                    });
                }
                else
                {
                    $.fn.blockstrap.accounts.updates(index, callback, new_txs, new_tx_count);
                }
            });
        }
        else
        {
            if(callback) callback();
        }
    }
    
    accounts.verify = function(account, fields, callback, password, chain, type)
    {
        $.fn.blockstrap.data.find('blockstrap', 'salt', function(salt)
        {
            var key = '';
            var original = false;
            if($.isArray(fields))
            {
                if(typeof account.original != 'undefined')
                {
                    original = account.original;
                }
                $.each(fields, function(k, v)
                {
                    if(v.id == 'wallet_blockchain' && type == 'hd')
                    {
                        v.value = [];
                        var chains = $.fn.blockstrap.settings.blockchains;
                        delete chains.multi;
                        $.each(chains, function(chain, obj)
                        {
                            v.value.push(chain);
                        });
                    }
                        
                    // TODO: Remove this hardcoded hack?
                    if(v.id == 'wallet_currency' && original)
                    {
                        v.value = original;
                    }
                    key_obj = CryptoJS.SHA3(salt+key+v.id+v.value, { outputLength: 512 });
                    key = key_obj.toString();
                });
            };
            if(key)
            {
                var keys = $.fn.blockstrap.blockchains.keys(key+account.code, account.code, 1);
                if(keys.pub === account.address)
                {
                    if(callback) callback(true, keys);
                    else return true;
                }
                else
                {
                    $.fn.blockstrap.core.modal('Warning', 'Credentials do not match');
                    $.fn.blockstrap.core.loader('close');
                }
            }
            else
            {
                $.fn.blockstrap.core.modal('Error', 'Unable to construct keys');
                $.fn.blockstrap.core.loader('close');
            }
        });
    }
    
    // MERGE THE NEW FUNCTIONS WITH CORE
    $.extend(true, $.fn.blockstrap, {accounts:accounts});
})
(jQuery);
