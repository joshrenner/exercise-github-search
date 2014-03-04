/*

    Code Sample
    -----------
    Designed per the instructions listed in the readme.
    I spent about 8 hours designing, writing, and refactoring to complete the exercise.

 */

// Example namespace
var domain = domain || {};

(function($, alert){
    "use strict";
    /*
        Global
     */
    // Utilities
    domain.utilities = domain.utilities || {};
    domain.utilities.supportsAttribute = function(element, attribute, value){
        var test = $(element).attr(attribute, value);
        return $(test)[0][attribute] === value;
    };
    domain.utilities.isFunction = function(object) {
        return !!(object && object.constructor && object.call && object.apply);
    };
    var _ = domain.utilities;

    // Modules
    domain.modules = domain.modules || {};

    /*
        Cache
        Holds key-value pairs of any object with API for
        Adding, Removing, Retrieving, Discovery, and Iterating
      */
    domain.modules.cache = function(){
        this._cache = {};
    };
    domain.modules.cache.prototype = {
        add: function(query, results){
            this._cache[query] = results;
            return this;
        },
        remove: function(query){
            delete this._cache[query];
            return this;
        },
        find: function(query){
            return (this.contains(query)) ? this._cache[query] : {};
        },
        contains: function(query){
            return (this._cache[query] !== undefined);
        },
        each: function(func){
            if (!_.isFunction(func)){
                return this;
            }
            var key,
                cache = this._cache;
            for(key in cache){
                if(cache.hasOwnProperty(key)){
                    func.apply(cache[key]);
                }
            }
            return this;
        }
    };

    /*
        Textbox
        Backwards compatible placeholder text
     */
    domain.modules.textbox = function(dom, placeholder){
        this.dom = dom;
        this.placeholder = placeholder || "";
        this._class = "watermark";
        // test for native support of functionality
        this.isModern = _.supportsAttribute("input", "placeholder", "test");
        // legacy support for placeholder text : modern support
        if (!this.isModern){
            var self = this;
            this.setWatermark();
            $(this.dom).focus(function(){self.clearWatermark();})
                .blur(function(){self.setWatermark();});
        } else {
            $(this.dom).attr("placeholder", this.placeholder);
        }
        return this;
    };
    domain.modules.textbox.prototype = {
        value: function(value){
            return (value !== undefined) ? $(this.dom).val(value)
                                         : $(this.dom).val();
        },
        setWatermark: function(){
            if(this.value() === ""){
                this.value(this.placeholder).addClass(this._class);
            }
            return this;
        },
        clearWatermark: function(){
            if(this.value() === this.placeholder){
                this.value("").removeClass(this._class);
            }
            return this;
        }
    };




    /*
        GithubSearch Application
     */
    domain.githubSearch = {};

    /*
        Messenger
        Responsible for setting and displaying messages,
        takes direction from Moderator
     */
    domain.githubSearch.messenger = function(dom){
        this.dom = $(dom) || $("<div class='messenger'></div>");
        this._cache = new domain.modules.cache();
    };
    domain.githubSearch.messenger.prototype = {
        load: function(messages){
            var key;
            for(key in messages){
                if(messages.hasOwnProperty(key)){
                    this.add(key, messages[key]);
                }
            }
            return this;
        },
        add: function(key, dom){
            var message = new domain.githubSearch.message(dom).hide();
            this._cache.add(key, message);
            this.dom.append(message.dom);
            return this;
        },
        remove: function(key){
            this.dom.remove(this._cache.find(key).dom);
            this._cache.remove(key);
            return this;
        },
        hide: function(key){
            this._cache.find(key).hide();
            return this;
        },
        show: function(key){
            this._cache.each(domain.githubSearch.message().hide);
            this._cache.find(key).show();
            return this;
        }
    };
    domain.githubSearch.message = function(dom){
        return {
            dom: $(dom) || $("<p></p>"),
            hide: function(){this.dom.hide(); return this;},
            show: function(){this.dom.show(); return this;}
        };
    };

    /*
        Results
        Responsible for formatting and listing the results,
        takes direction from Moderator
     */
    domain.githubSearch.results = function(dom){
        this.dom = dom;
    };
    domain.githubSearch.results.prototype = {
        show: function(results){
            var length = results.length,
                html = $("<div class='repositories'></div>");
            for (var i=0; i < length; i++) {
                html.append(this._formatRepository(results[i]));
            }
            $(this.dom).html(html);
            return this;
        },
        _formatRepository: function(repository){
            var overview = this._formatOverview(repository),
                details = this._formatDetails(repository),
                html = $(overview).click(function(){ alert(details); $(this).addClass("viewed"); });
            return html[0];
        },
        _formatOverview: function(repository){
            var owner = repository.owner,
                name = repository.name;
            return "<div class='repository'><span class='owner'>${owner}</span>&nbsp;/&nbsp;<strong class='name'>${name}</strong></div>"
                    .replace("${owner}", owner)
                    .replace("${name}", name);
        },
        _formatDetails: function(repository){
            var detailProps = {
                    "Language": repository.laguage,
                    "Followers": repository.followers.toString(),
                    "URL": "https://github.com/" + repository.owner + "/" + repository.name,
                    "Description": repository.description
                },
                template = "${label}: ${value}\n",
                formatter = function(label, value){
                    value = (value === null || value === undefined) ? "" : value;
                    return template.replace("${label}", label)
                        .replace("${value}", value);
                },
                text = "";
            for (var prop in detailProps) {
                if(detailProps.hasOwnProperty(prop)){
                    text += formatter(prop, detailProps[prop]);
                }
            }
            return text;
        }
    };

    /*
        Searcher
        Responsible for making http requests,
        communicates with Moderator
     */
    domain.githubSearch.searcher = function(url){
        this._moderator = {};
        this._url = url;
    };
    domain.githubSearch.searcher.prototype = {
        moderator: function(moderator){
            if (moderator){
                this._moderator = moderator;
                return this;
            }
            return this._moderator;
        },
        search: function(query){
            var self = this,
                url = this._url;
            $.ajax({
                url: url + query,
                crossDomain: true,
                dataType: "jsonp",
                success: function(data){ self._onSuccess(query, data); },
                beforeSend: function(){ self._onSearching(); },
                complete: function(){ self._onSearched(); },
                error: function(data){ self._onError(data); }
            });
            return this;
        },
        _onSearching: function(){
            this._moderator.loading();
        },
        _onSearched: function(){
            this._moderator.loaded();
        },
        _onSuccess: function(query, data){
            this._moderator.success(query, data);
        },
        _onError: function(){
            this._moderator.error();
        }
    };

    /*
        Moderator
        Responsible for coordinating communication between objects,
        can handle new logic for deciding when to call other objects
        without changing how they work
     */
    domain.githubSearch.moderator = function(config){
        var self = this,
            messages = {
                waiting: $("<div class='notice'>Waiting for query...</div>"),
                loading: $("<div class='notice'>Loading results...</div>"),
                limit: $("<div class='error'>You have reached the limit for queries</div>"),
                empty: $("<div class='error'>There were no results for this query</div>"),
                general: $("<div class='error'>There was an error</div>")
            };

        this._search = config.search;
        this._messenger = config.messenger.load(messages);
        this._results = config.results;
        this._cache = config.cache;
        this._searcher = config.searcher.moderator(this);
        this._isLoading = false;
        this._timeout = null;
        this._lastQuery = "";

        $(this._search.dom)
            .keyup(function(){
                self.onQueryChanged(self._search.value());
            });
    };
    domain.githubSearch.moderator.prototype = {
        onQueryChanged: function(query){
            if (query === ""){
                return this;
            }else if (this._cache.contains(query)){
                return this._showResults(this._cache.find(query));
            }else{
                return this._queryGithub(query);
            }
        },
        loading: function(){
            if (this._isLoading){
                return this;
            }
            this._isLoading = true;
            this._messenger.show("loading");
        },
        loaded: function(){
            this._messenger.hide("loading");
            this._isLoading = false;
        },
        success: function(query, results){
            var repos = results.data.repositories;
            if (repos === undefined){
                return this.error("limit");
            }
            if (repos.length < 1){
                return this.error("empty");
            }
            this._cache.add(query, repos);
            return this._showResults(repos);
        },
        error: function(key){
            key = (key === undefined) ? "general" : key;
            this._messenger.show(key);
            return this;
        },
        _queryGithub: function(query){
            var self = this;
            this._lastQuery = query;

            if (!this._timeout){
                this._messenger.show("waiting");
                this._timeout = setTimeout(function(){
                    self._makeRequest();
                }, 500);
            }
            return this;
        },
        _makeRequest: function(){
            this._searcher.search(this._lastQuery);
            this._messenger.hide("waiting");
            this._lastQuery = "";
            this._timeout = null;
        },
        _showResults: function(results){
            this._results.show(results);
            return this;
        }
    };

})(jQuery, alert);


/*
    Page Instance
 */
$(function(){
    "use strict";
    var baseStyles = "body{width:500px;margin:2em;padding:0;font:300 14px sans-serif;}",
        searchStyles = "#search {width:100%;font-size:16px;}#search.watermark {color:#ccc;}",
        resultsStyles = ".repositories{background:#5D91FA;padding:1px;margin-top:2em;border:2px solid #0F53DB;}.repository{background:rgba(255,255,255,.6);margin:.25em;padding:.25em .5em;cursor:pointer;border:1px solid #fff;}.repository:hover{background:rgba(255,255,255,.9);}.repository.viewed{background:rgba(255,255,255,.35);}.repository .owner{color:#0F53DB;}.repository .name{color:#000;font-weight:800}#error{color:red}";
    $("head").append("<style>" + baseStyles + searchStyles + resultsStyles + "</style>");
    $("#results").prepend("<div id='messenger'></div>").append("<div id='repositories'></div>");

    var config = {
            search: new domain.modules.textbox($("#search"), "Search Github"),
            messenger: new domain.githubSearch.messenger($("#messenger")),
            results: new domain.githubSearch.results($("#repositories")),
            searcher: new domain.githubSearch.searcher("https://api.github.com/legacy/repos/search/"),
            cache: new domain.modules.cache()
        };
    new domain.githubSearch.moderator(config);
});
