/*
 * 
 *  Blockstrap v0.5
 *  http://blockstrap.com
 *
 *  Designed, Developed and Maintained by Neuroware.io Inc
 *  All Work Released Under MIT License
 *  
 */

(function($) 
{
    var styles = {};
    
    styles.element = function(key)
    {
        var map = styles.map('elements');
        var element = '#' + $.fn.blockstrap.settings.id + ' ' + map[key];
        return element;
    };
    
    styles.map = function(type)
    {
        return $.fn.blockstrap.settings.styles[type];
    }
    
    styles.rule = function(key, value)
    {
        var map = styles.map('rules');
        var rule = map[key] + ': ' + value;
        return rule;
    };
    
    styles.set = function(id, index)
    {
        if(!index) index = 0;
        if(!id) id = 'blockstrap-styles';

        var style = document.createElement('style');
        style.id = id;
        style.setAttribute("type", "text/css");

        // WebKit hack :(
        style.appendChild(document.createTextNode(""));

        document.head.appendChild(style);
        var tag = document.getElementById(id);
        console.log('tag', tag);
        var sheet = tag.sheet ? tag.sheet : tag.styleSheet;
        var styles = $.fn.blockstrap.settings.styles.vars;
        console.log('styles', style.sheet);
        if($.isPlainObject(styles))
        {
            $.each(styles, function(k, v)
            {
                var rule = $.fn.blockstrap.styles.rule(k, v);
                var element = $.fn.blockstrap.styles.element(k);
                console.log('rule', rule);
                console.log('element', element);
                console.log('sheet', sheet);
                console.log('index', index);
                if(sheet.insertRule) 
                {
                    console.log('a1');
                    sheet.insertRule(element + ' { ' + rule + ' !important }', index);
                    index++
                }
                else 
                {
                    console.log('b1');
                    sheet.addRule(element, rule, index);
                    index++
                }                        
            });
        }
    };
    
    // MERGE THE NEW FUNCTIONS WITH CORE
    $.extend(true, $.fn.blockstrap, {styles:styles});
})
(jQuery);
