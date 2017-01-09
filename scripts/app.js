
jQuery(function ($) {
    var apiURL = 'https://en.wikipedia.org/w/api.php?';
    var results;
    var offset = 0;
    var isData = false;
    var numOfResults = 30;
    // let reqTimer = 0;
    
    class Message {
        constructor(messageTypeCode = 1){
            /* 
                messageTypeCode = 1  //generate file
                messageTypeCode = 2 //generate html
            */
            this.messageTypeCode = messageTypeCode;
            this.messageText = null;
            this.audioMessage = null;
        }
        
        generateAudioMsg() {
            let msg = new window.SpeechSynthesisUtterance();
            msg.text = this.audioMessage;
            // msg.lang = "en-EN";
            window.speechSynthesis.speak(msg);
        }
        
        generateNotification() {
                // Let's check if the browser supports notifications
          if (!("Notification" in window)) {
            alert("This browser does not support desktop notification");
          }
        
          // Let's check whether notification permissions have already been granted
          else if (Notification.permission === "granted") {
            // If it's okay let's create a notification
            var notification = new Notification(this.messageText);
          }
        
          // Otherwise, we need to ask the user for permission
          else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
              // If the user accepts, let's create a notification
                let options = {
                    sound: ""
                };
                var notification = new Notification(this.messageText, options);
            });
          }
          //hide notification window
          setTimeout(function(){  
            if(notification){
              notification.close();
            }
          },3000);
        }
    }
    
    let pagination = {
        numOfPages: 0,
        limit: 20,
        currentPage: 0
    };
    
    let reqTimer = {
        timerObj: null,
        timerVal: 0,
        resetTimerObj: function(){
            this.timerObj = null;
        },
        resetTimerVal: function(){
            this.timerVal = 0;
        }
    };
    function focusSearch() {
        $('.search-box').on('keypress', function (e) {
            var searchValue = $('.search-box').val();
            var key = e.which;
            $(this).css('{marginTop: 0}');
            if (searchValue !== '' && key == 13) {
                results = null;
                offset = 0;
                $('.results').empty();
                $('.results').html('<b>Loading<i class="fa fa-spinner fa-pulse fa-fw"></i><span class="sr-only">Loading...</span><b>');
                if(/^list of/gi.test(searchValue)) {
                    isListValid(searchValue);
                    isData = false;
                } else {
                    sendRequest(searchValue,numOfResults);
                }
                
            }
        });
        $('.search-box').on('focusout', function () {
            if ($(this).val() == '') $('.results').empty();
        });
        $(".search-box").focus(function() { 
            $(this).select(); 
        });
        
        
        $('.search-area').on('mouseleave',function(){
            $('.autocomplete-text').hide().empty();
        });
        
      
    }
    
    function clearContent () {
        $('.clear-input-button').on('click',function(){
            $('.results').empty();
            $('.search-box').val('');
            isData = false;
        });
    }

    //https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=You
    function autocomplete(searchValue) {
        var promise = new Promise(function(fulfill,reject){
            return fulfill(searchValue);
        });
        promise.then(function(searchValue){
            $('.autocomplete-text').hide().empty();
            return $.ajax({
                 url: apiURL
                , dataType: 'jsonp'
                , data: {
                    action: 'query'
                    , list: 'search'
                    , srsearch: searchValue
                    , format: 'json'
                }
            , }).done(function (data) {
                var results = data.query.search.filter((result) =>{
                   return result.title.toLowerCase().indexOf(searchValue.toLowerCase()) > -1;
                });
                for(let result of results){
                    $('<div class="autocomplete-title">').html(result.title).appendTo('.autocomplete-text');
                }
                $('.autocomplete-text').show();
              });
        });
    }
    
    function isListValid(searchValue){
        $.ajax({
            url: 'list.php',
            type: "get",
            data: {
                listName: searchValue,
                action: "checkValidity"
            }
        }).done(function(data){
            if(data.messageCode == 1000){
                getListContent(searchValue);
            } else {
                sendRequest(searchValue,numOfResults);
            }
        });
    }
    
    function sendRequest(searchValue,numOfResults) {
        //https://en.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srprop=timestamp&&srsearch=intitle:adams%20brian
        /**/
        return $.ajax({
            async: true
            , url: apiURL
            , dataType: 'jsonp'
            , data: {
                action: 'opensearch'
                , search: searchValue
                , limit: numOfResults
                , namespace: '0'
                , prop: 'images'
            }
        }).done(function (data) {
            console.log(data);
            results = data;
            $('.results').empty();
            createDiv();
       });
    }
    
    function toggleArrow(el = '.arrow'){
        $(el).toggle();
    }
    
    var createDiv = function(resultsNum = 5) {
        isData = true;
        if($('.arrow').css('display') == 'none'){
            $('.arrow').css({'display':'block'});
        }
        if(results[1].length <= resultsNum){
            resultsNum = results[1].length;
        }
        var responseBox = $('.results');
        for(var i = (offset > 0 ? offset:0); i < (offset > 0? offset+1:resultsNum);i++){
            var content;
            var $result = $('<div></div>').addClass('col-xs-10 col-xs-offset-1 col-md-6 col-md-offset-3');
            if (results[1].length == 0){
                content = '<p>No results found!</p>';
                responseBox.append($result.html(content).addClass('content'));
                isData = false;
                return;
            } else {
                var $link = $('<a></a>').attr('href', results[3][i]).addClass('external-content');
                content = '<p>' + results[1][i] + '</p><p>' + results[2][i] + '</p>';
                responseBox.append($link.append($result.html(content).addClass('content')));
                if(isData){
                    $link.hide().fadeIn(2000);
                }
            }
        }
        if(offset == 0){
            offset = resultsNum;
        } else {
            offset++;
        }
        if(offset >= results[1].length){
            isData = false;
            toggleArrow();
            responseBox.append($('<div></div>').addClass('col-xs-10 col-xs-offset-1 col-md-6 col-md-offset-3').addClass('content').html('No more results are available!').css({'color':'white','background':'red'}));
            return;
        }
    };
    
    function getListContent(listName){
        //create object of file types + loop over each file type and create dom element
        // listName = listName.split(' ').join('_');
        $('.results').empty();
//        let url = 'https://php-sandbox-st3fun1.c9users.io/Wikipedia Viewer/';
        let responseBox = $('.results');
        let $status = $("<p>").addClass("status hidden");
        let $list = $('<div>').addClass('col-xs-10 col-xs-offset-1 col-md-6 col-md-offset-3 content').attr('id','list-intro');
        let btnClass = 'btn btn-default btn-custom';
        let $jsonLink = $('<a>').attr('href','makefile.php?list='+listName+'&format=json').html('<button class="'+ btnClass +'">JSON</button>').addClass('make-file-link');
        let $xmlLink =$('<a>').attr('href','makefile.php?list='+listName+'&format=xml').html('<button class="'+ btnClass +'">XML</button>').addClass('make-file-link');
        let $htmlLink= $('<a target="_blank">').attr({
            'href' : 'list.php?listName='+listName,
            'data-page': 1
        }).html('<button class="'+ btnClass +'">HTML</button>').addClass('html-link');
        let $title = $('<p class="title">').html(listName);
        let $buttons = $('<div>').append([$jsonLink,$xmlLink,$htmlLink]);
        responseBox.append($list.append([$title,$status,$buttons]));
    }
    
    // function generateForm(){
        
    // }
    //actionCode
    // 1 - makeFile
    // 0 - generateHTML
    
    function getMakeFileResponse($btn,cb){
        $(document).on('click',$btn,function(e){
           //shorter pagination
           setCurrentPage($(this).attr('data-page'));
           e.preventDefault();
           $.ajax({
              url: $(this).attr('href'),
              beforeSend: function(){
                  $('.status').removeClass('hidden').html('<i class="fa fa-spinner fa-pulse fa-fw"></i><span class="sr-only">Loading...</span> Please wait! Fetching data from server...');
                   reqTimer.timerObj = setInterval(function(){
                      reqTimer.timerVal += 1;
                      console.log(reqTimer.timerVal);
                  },1000);
              }
           }).done(cb)
             .always(function(){
                  if(reqTimer.timerObj !== null){
                      clearInterval(reqTimer.timerObj);
                      reqTimer.resetTimerObj();
                  } 
              })
             .then(function(data){
                  if(message.messageTypeCode == 1) {
                      message.messageText = "The file has been created successfully.";
                      message.audioMessage = message.messageText;
                  } else {
                      message.messageText = "The content has been loaded successfully.";
                      message.audioMessage = message.messageText;
                  }
                  if(data.url) {
                      message.messageText = `You can find your ${data.fileType} file <a href="${data.url}" target="_blank">here</a>.`;
                      message.audioMessage = "Your file has been created successfully!";
                  }
                  $('.status').html(message.messageText);
              })
             .then(function(){
                 console.log('1t');
                if(reqTimer.timerVal >= 5){
                   console.log('2t');
                   message.generateAudioMsg();
                   message.generateNotification();
                }
                reqTimer.resetTimerVal();
             })
             .fail(function(obj){
               console.log(obj.statusText);
             });
        });  
    }
    var loadMoreResults = function () {
        
        $(window).scroll(function () {
            
            if ($(window).scrollTop()-300 == $(document).height() - $(window).height()-300) {
                if(isData){
                    createDiv();
                }
            }
        });
    };
    $('.search-box').on('keyup',function () {
        var searchValue = $('.search-box').val();
        if(searchValue.length > 1){
            $(this).css({'width':'15em'});
            autocomplete(searchValue);
        }
    });
    $('.autocomplete-text').on('click', '.autocomplete-title',function(){
        $('.results').empty();
        $('.results').html('<b><i class="fa fa-spinner fa-pulse  fa-fw"></i><span class="sr-only">Loading...</span> Loading...<b>');
        $('span>.search-box').html($(this).text());
        offset = 0;
        if(/List of/gi.test($(this).text())) {
            isListValid($(this).text());
        } else {
            sendRequest($(this).text(),numOfResults);
        }
        $('.search-box').val($(this).text());
        $('.autocomplete-text').hide().empty();
    });
    
    
    function setCurrentPage(pageNum = 0){
        pagination.currentPage = pageNum;
    }
    
    function setNumOfPages(listLen = 0){
        pagination.numOfPages = parseInt(listLen / pagination.limit,10);
    }
    
    function createListDivs (data) {
        if(data.listLength){
           setNumOfPages(data.listLength); 
        }
        if(!$('.results').is(':empty')){
            $('.results').children().not('#list-intro').remove();
        }
        $('.results').prepend(createPagination(pagination.numOfPages,pagination.limit,pagination.currentPage));
        //add pagination
        let listOfPersons = $('<div id="list-items">');
        data.list.forEach(function(v,i){
          let $result = $('<div>').addClass('col-xs-10 col-xs-offset-1 col-md-6 col-md-offset-3 content');
          let $title = $('<p>').html($('<a>').attr({
              'href':'http://en.wikipedia.org/wiki/'+ v.name,
              'target':'_blank'
          }).html(v.name).addClass('external-content'));
          let description = null;
          if(v.description == '' || v.description == null){
              description = 'No description found.';
          } else {
              
              let firstSentence = v.description.split(/[.|!|?]\s/)[0];
              if(firstSentence.slice(0,-1) !== '.') firstSentence += '.';
              description = firstSentence;
              
          }
          let $description = $('<p>').html(description);
          $result.append([$title,$description]);
          listOfPersons.append($result);
        });
        listOfPersons.insertAfter('#list-intro');
        $('.results').append(createPagination(pagination.numOfPages,pagination.limit,pagination.currentPage));
        displayCurrentPageDetails();
    }
    
    function displayCurrentPageDetails(){
        let $currentPage = $('<p class="current-page">').html(`Page ${pagination.currentPage} of ${pagination.numOfPages}`);
        $currentPage.prependTo('.pagination-container');
    }
    function displayResponseMessage(data){
        $('.status').removeClass('hidden').html('You can find your file <a href="' + data.url + '">here.</a>');
    }
    
    // to do: limit pagination links
    function createPagination(numOfPages,resultsLimit,page){
        let titleOfList = $('.title').text();
        let pageNum = parseInt(page,10);
        let $pagination = $('<div>').addClass('pagination-container col-xs-10 col-xs-offset-1 col-md-6 col-md-offset-3');
        let $ul = $('<ul>').addClass('pagination');
        if(pageNum > 0 && pageNum < numOfPages) {
            $ul.append($('<li>').html(`<a data-page = "${pageNum + 1}" href="list.php?listName=${titleOfList}&page=${pageNum+1}&limit=${resultsLimit}">Next &gt;&gt;</a>`));
        }
        for(let i = 1; i <= numOfPages; i++){
             let link = $('<li>').html('<a data-page = "'+ i +'" href="list.php?listName='+ titleOfList +'&page='+ i +'&limit='+resultsLimit+'">' + i + '</a>');
             $ul.append(link);
        }
        if(page > 1 && page <= numOfPages) {
            $ul.append($('<li>').html(`<a data-page = "${pageNum - 1}" href="list.php?listName=${titleOfList}&page=${pageNum-1}&limit=${resultsLimit}">&lt;&lt; Prev</a>`));
        }
        return $pagination.append($ul);
    }
    
    // function getImage(){
        
    // }
    var message = new Message(1);
    console.log(message);
    focusSearch();
    loadMoreResults();
    clearContent();
    getMakeFileResponse('.make-file-link',displayResponseMessage);
    getMakeFileResponse('.html-link',createListDivs);
    getMakeFileResponse('.pagination > li > a',createListDivs);
    $(document).on('click','.make-file-link',function(){
         message.messageTypeCode = 1;
    });
    $(document).on('click','.html-link',function(){
        message.messageTypeCode = 2;
    });
});