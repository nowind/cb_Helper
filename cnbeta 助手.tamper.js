// ==UserScript==
// @name           cnbeta 助手
// @description    cnbeta 评论找回 文章收藏 快速评论和打分 页面优化 分享增强 
// @include        http://cnbeta.com/articles/*
// @include        http://www.cnbeta.com/articles/*
// @include        http://cnbeta.com/
// @include        http://www.cnbeta.com/
// @namespce       itkso.com
// @grant          GM_xmlhttpRequest
// @grant          GM_addStyle
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          unsafeWindow
// @require         http://static.cnbetacdn.com/assets/js/jquery.js
// @require         http://onehackoranother.com/projects/jquery/tipsy/javascripts/jquery.tipsy.js
// @updateURL       https://userscripts.org/scripts/source/170299.meta.js
// @downloadURL     https://userscripts.org/scripts/source/170299.user.js
// @license         MIT License
// @version         0.3.9
// @run-at          document-end
// @author          @nowind
// ==/UserScript==
(function()
 {
     "use strict";
     //调试开关 总控所有输出
     function Log(s){
         var _LOG=false;
         if(_LOG)
         {console.log(s);}
     }
     // 获取不安全的win 
     function MustGetUnsafeWin()
     {
         if(window.unsafeWindow){return window.unsafeWindow;}
         //  脚本注入,在部分chrome中会失败
         var c=document.createElement('div');
         c.setAttribute('onclick','return window');
         return c.onclick();
     }
     //添加样式
     function MustAddStyle(s)
     {
         if(window.GM_addStyle)
         {GM_addStyle(s);}
         else
         {
             $('head').append($('<style/>').html(s));
         }
     }
     
     var 
     uWin=MustGetUnsafeWin(),
         
     //文章信息
     Article =
         {
             // 语法糖,防止出现null
             id:parseInt((/[0-9]{4,6}/.exec(location.href))+'',10),
             title:$('#news_title').html(),
             //取发布时间
             publish_date:(function(){
                 var author = $('.date');
                 if(author.length<1){return new Date();}
                 var t = /([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/.exec(author.html());
                 return new Date(t[1],t[2]-1,t[3],t[4],t[5],t[6]);
             })()
         },
         // 评论相关函数
    CB_comment=
         {
             //定义常量
             GETTER_STYlE:'#yigle_net_yueguangbaohe{border-radius:5px;overflow:hidden;position:fixed;top:20px;right:50px;width:50px;height:50px;background:black;cursor:pointer;opacity:0.9;} #y_tips{position: fixed;bottom: 25px;right: 5px;width: 260px;padding: 6px;color: rgb(255, 255, 255);background-color: rgb(0, 0, 0);text-align: center;}'
             +'.commt_list .comment_avatars,blockquote .re_mark,blockquote .title,.rating_box ,.commt_list > nav,.article .navi{display:none !important;}'+
             ' .commt_list .comment_body {padding-left:5px !important;} .commt_list .comment_body .re_mark{display:none;} span.datetime{cursor: pointer;}'+
             '.post_commt .textarea_wraper{display:inline;} .commt_sub{right: 100px;top: 1px;position:absolute !important;} #post_tips{top: 80px;} .commt_list dd {margin: 0px !important;}'+
             '.commt_list blockquote,.commt_list blockquote p.re_text{margin:0 0 0 10px !important;padding: 0px !important;} .pm{padding-left:10px;padding-right:10px}',

             //按照月光宝盒定义
             BOX_ID:'yigle_net_yueguangbaohe',
             // 提示显示时长
             TIP_TIME:4500,
             //定义元素
             boxEl:document.createElement('div'),
             moonEl:document.createElement('canvas'), 

             // 获取的数据
             showLv:0,//控制评论显示的优先级
             isReq:false,
             // 其他
             isFirst:true,
             
             //画图标 来自月光宝盒
             draw_a_moon:function (auto){
                 Log('enter draw_a_moon');
                 GM_setValue('auto',auto);
                 var context;
                 this.boxEl.style.backgroundColor =auto ? '#adcaec' : 'black';
                 this.moonEl.title = auto ? '右击切换到手动模式' : '右击切换到自动模式';
                 $(this.moonEl).attr('auto',!!auto);
                 context = this.moonEl.getContext('2d');
                 context.clearRect(0,0,300,300);
                 //var x = -1;
                 //var y = -1;
                 context.beginPath();
                 context.fillStyle = '#ffffff';
                 context.strokeStyle = '#ffffff';
                 context.arc(19, 25, 20, -1.5*Math.PI/2, 1.5*Math.PI/2);
                 context.fill();
                 context.arc(19, 25, 20, -1.5*Math.PI/2, 1.5*Math.PI/2);
                 context.closePath();
                 
                 context.stroke();
                 context.beginPath();
                 context.fillStyle = auto ? '#adcaec' : 'black';
                 context.strokeStyle = auto ? '#adcaec' : 'black';
                 context.arc(2, 25, 25, -Math.PI/2, Math.PI/2);
                 context.fill();
                 context.arc(2, 25, 25, -Math.PI/2, Math.PI/2);
                 context.closePath();
                 context.stroke();
                 if(!this.isFirst)this.TipAdd('进入'+(auto?'自动':'手动')+'模式');
                 else this.isFirst=false;
                 Log('leave draw_a_moon');
             },
             // 添加Tip 提示 来自月光宝盒
             TipAdd:function (s)
             {
                 Log('enter TipAdd');
                 $('#y_tips').remove();
                 var tip=document.createElement('div');
                 $(tip).attr('id','y_tips');
                 $(tip).html(s);
                 $('body').append(tip);
                 try{
                     $(tip).fadeOut(this.TIP_TIME,function(){$(this).remove();});
                 }
                 catch(e)//fx似乎有点问题
                 {      
                     Log('fadeOut error!');
                     try{
                         window.setTimeout(function(){var x=document.getElementById('y_tips');x.parentNode.removeChild(x);},CB_comment.TIP_TIME-1000);
                     }
                     catch(e1)
                     {Log(e1.message);}//sorry,no idea here..
                 }
                 Log('leave TipAdd');
             },
             // 判断是否过期
             ifDated :function (){
                 Log('enter ifDated');
                 
                 var publish_day = Article.publish_date,
                     
                     //今天0时的时间戳
                     date = new Date(),
                     today = new Date(date.getFullYear(),date.getMonth(),date.getDate());
                 return ((date-publish_day)/(24*3600*1000)) >= 1;
             },
             // 通过hook网页的代码来设置评论
             // ifSql控制是否写到websql
             setComment:function (data,ifSql)
             {
                 try{
                     Log('start json parse');
                     var ret,newdata;
                     //  未还原的字符
                     if(typeof data=='string'){
                         //是新格式?
                         newdata=data.match(/^okcb\d*\((.*)\)$/);
                         //去掉头
                         if(newdata)
                             data=newdata[1];
                         //还原
                         ret=JSON.parse(data);
                        }
                     else //否则直接使用
                         ret=data;
                     //新格式要对结果base64
                     if(typeof ret.result == 'string'){
                         ret.result=JSON.parse(uWin.$.cbcode.de64(ret.result,true,8));
                        }
                     //是否有评论
                     if(typeof ret.result.cmntstore ==='undefined' ||ret.result.cmntlist.length<1)return;
                     //websql操作
                     if(ifSql&&window.openDatabase)
                        {
                         var db=window.openDatabase('cbComment','1.0','For cb Helper',10*1024*1024);
                         db.transaction(function (tx) {  
                             tx.executeSql('CREATE TABLE IF NOT EXISTS cbdata (id unique, data)');
                             var data=JSON.stringify(ret);
                             tx.executeSql('select id,data from cbdata where id=?',[Article.id],function(tx,ts){
                                 if(ts.rows.length<1)tx.executeSql('insert into cbdata (id, data) values(?,?)',[Article.id,data]);
                                 else tx.executeSql('update cbdata set data=? where id=?',[data,Article.id]);
                             });
                         });
                        }
                     //hook并实现评论显示
                     uWin.GV.COMMENTS.CMNTDICT=ret.result.cmntdict;
                     uWin.GV.COMMENTS.CMNTLIST=ret.result.cmntlist;
                     uWin.GV.COMMENTS.HOTLIST=ret.result.hotlist;
                     uWin.GV.COMMENTS.CMNTSTORE=ret.result.cmntstore;
                     uWin.GV.COMMENTS.SHOWNUM=ret.result.cmntlist.length;
                     uWin.GV.COMMENTS.MORENUM=100;
                     uWin.GV.COMMENTS.MOREPAGE=1;
                     uWin.GV.COMMENTS.PAGE=1;
                     // 拓展变量作用域
                     var genList,genHotList,_hook,self,loadCmt,cmtList,lastT,more,
                         initData,bindAction,fixed_top;
                     var GV=uWin.GV;
                     var CB=uWin.CB;
                     Log('eval begin');
                     // 去掉函数调用以及声明
                     eval('_hook='+uWin.$.cmtOnload.toString().replace('initData(1)','').replace(/var/g,''));
                     Log('_hook start');
                     _hook('.commt_list');
                     $("#comment_num").html(ret.result.comment_num);
                     $("#view_num").html(ret.result.view_num);
                     $(".post_count").html('共有<em>'+ret.result.comment_num+'</em>条评论，显示<em>'+ret.result.join_num+'</em>条').fadeIn();
                     uWin.initData=initData;
                     uWin.genList=genList;
                     genList();
                     Log('genHotList start');
                     $("#J_hotcommt_list").parent().show();
                     genHotList();
                     bindAction();
                 }
                 catch(e)
                 {Log(e.message);}
             },
             // 获取内容
             GetContent :function()
             {
                 Log('enter GetContent');
                 // 文章id
                 var id=Article.id,
                        //2个停用的源
                     //  yg_url = 'http://yueguang.sinaapp.com/?id=' + id,
                     // iz_url = 'http://py.imorz.tk/tools/cb/hotcomment/'+id,
                     my_url = 'http://arm.itkso.com/php/cb.php?sid='+id,
                     offical_url = 'http://api.cnbeta.com/capi/phone/comment?article=' +id;
                 //从个人服务器获取数据
                 function fetchMyUrl()
                 {
                     GM_xmlhttpRequest({
                         timeout:1000*30,//服务器比较破没办法
                         method: "GET",
                         url:my_url,
                         onload: function(response) {
                             CB_comment.iz_Req=true;
                             var data=response.responseText;
                             if( data.length>1)
                             {
                                 CB_comment.setComment(data,true);
                                 CB_comment.showLv=4;
                                 CB_comment.TipAdd('个人服务器获取数据成功');
                             }
                             else
                             {
                                 CB_comment.TipAdd('个人服务器没有收录此页面评论数据');
                             }
                             
                         }
                     });
                 }
                 // 官方
                 function fetchOfficalPhoneUrl()
                 {
                     GM_xmlhttpRequest({
                         method: "GET",
                         url:offical_url,
                         onload: function(response) {
                             if(CB_comment.showLv>3)return;
                             CB_comment.iz_Req=true;
                             var data=JSON.parse(response.responseText);
                             // 官方手机api返回数组型,需转成需要的形式
                             if( data.length>0)
                             {
                                 var newdata={u:[],cmntdict:{},hotlist:[]},lis=[],sto={};
                                 data.forEach(function(i)
                                     {
                                      sto[i.tid]={tid:i.tid,
                                      name:'CB官方API',//用户名
                                      comment:i.comment,
                                      reason:i.against,
                                      date:i.date,
                                      score:i.support,
                                      host_name:'里世界'//ip
                                     };
                                      lis.push({tid:i.tid,parent:''});
                                     });
                                 newdata.cmntlist=lis;
                                 newdata.cmntstore=sto;
                                 newdata.comment_num=newdata.join_num=lis.length;
                                 Log(newdata);
                                 CB_comment.setComment({result:newdata},false);
                                 CB_comment.showLv=3;
                                 CB_comment.TipAdd('官方手机API获取数据成功');
                             }
                             else
                             {
                                 CB_comment.TipAdd('官方手机API未得到数据');
                             }
                         }
                     });
                 }
                 function fetchData()
                 {
                     fetchOfficalPhoneUrl();
                     fetchMyUrl();
                 }
                 // 先查询本地是否有数据
                 if(window.openDatabase)
                 {
                     var db=openDatabase('cbComment','1.0','For cb Helper',10*1024*1024);
                     db.transaction(function (tx) {  
                         tx.executeSql('CREATE TABLE IF NOT EXISTS cbdata (id unique, data)');
                         tx.executeSql('select id,data from cbdata where id=?',[Article.id],function(tx,ts){
                             if(ts.rows.length<1)
                             {fetchData();}
                             else 
                             {CB_comment.setComment(ts.rows.item(0).data,false);}
                         });
                     });
                 }
                 else 
                 {
                     fetchData();
                 }
                 //以下两个源弃用
                 /* //月光宝盒获取 切分后分开加到评论和热门
                 GM_xmlhttpRequest({
                     method: "GET",
                     url:yg_url,
                     onload: function(response) {
                         if(CB_comment.isShow>2)return;
                         CB_comment.iz_Req=true;
                         var data=response.responseText;
                         var yg_Data = data.split('--pushudefengexian--');
                         if( yg_Data.length>1)
                         {
                             $('.commt_list').css('display','');
                             $('#J_hotcommt_list').html(yg_Data[0]);
                             $('#J_commt_list').html(yg_Data[1]);
                             //第二等级
                             CB_comment.isShow=2;
                         }
                         else
                         {
                             CB_comment.TipAdd('月光宝盒没有收录此页面评论数据');
                         }
                         
                     }
                 });
                 Log('Post yueguanbaohe');
                 // 热门获取 该数据源数据直接加到热门下边即可
                 GM_xmlhttpRequest({
                     method: "GET",
                     url:iz_url,
                     onload: function(response) {
                         CB_comment.iz_Req=true;
                         var data=response.responseText;
                         var iz_Data = data;
                         var isOk=(iz_Data.indexOf('抱歉，本篇无热门评论或未收录')==-1);
                         if (CB_comment.isShow<1&&iz_Data&&isOk)
                         {
                             $('#J_hotcommt_list').html(iz_Data);
                             //最低
                             CB_comment.isShow=1;
                         }
                         if(!isOk)
                         {
                             CB_comment.TipAdd('热门评论没有收录此页面评论数据');
                         }
                     }});
                 Log('Post imorz');*/
             },
             // 显示
             ShowContent:function()
             {
                 if(!this.isReq)
                 {
                     this.isReq=true;
                     this.GetContent();
                 }
             },
             //添加移动站内容
             AddMobileComment:function()
             {
                 var url='http://m.cnbeta.com/comments.htm?id='+Article.id;
                 GM_xmlhttpRequest({
                     method: "GET",
                     url:url,
                     onload: function(response) {
                         CB_comment.iz_Req=true;
                         var data=response.response;
                         //Log(data);
                         if (CB_comment.showLv<1)
                             {
                             Log($(data).filter('.content'));
                             $('#J_commt_list').html($($(data).filter('.content')));
                             CB_comment.showLv=1;
                             }
                         CB_comment.TipAdd('移动站数据抓取成功'); 
                     }
                 });
             },
             //初始化
             init_Comment:function()
             {
                 // 没过期不显示
                 Log('enter init_Comment');
                 //优化评论,不要那么的多 在DOM变动的时候处理
                 $('.commt_list').on('DOMNodeInserted',
                   function(e)
                   {
                       if(e.target.nodeName!='DL')return true;
                       $(e.target).find('.datetime').html('<span ref="p" class="pm">+1</span><span ref="m" class="pm">-1</span>点击出现支持反对');
                       return true;
                   });
                 // 处理上面添加的按钮的事件 通过冒泡想上一级发送
                 $('#J_commt_list dl').live('click',function(e1)
                     {
                        if(e1.target.className=='datetime')
                        {
                            $(this).find('.re_mark').show();
                            return false;
                        }
                        else if(e1.target.className=='pm')
                        {
                            var pm=$(e1.target).attr('ref'),
                            node='.comment_body>.re_mark a[action-type=against]';
                            if(pm=='p')
                                node= '.comment_body>.re_mark a[action-type=support]';
                            uWin.jQuery(this).find(node).click();
                            if(pm=='p')CB_comment.TipAdd('支持了一下');
                            else CB_comment.TipAdd('反对了一下');
                        }
                    });
                 //按照月光宝盒的要求写入
                 this.boxEl.id = this.BOX_ID;
                 $(this.boxEl).append(this.moonEl);
                 $('body').append(this.boxEl); 
                 //判断是否启动自动模式
                 var Auto=GM_getValue('auto',false);
                 //是否过期
                 if(!this.ifDated())
                 {
                     this.draw_a_moon(false);
                     $(this.moonEl).click(function()
                      {
                          CB_comment.AddMobileComment();
                          return false;
                      });
                     return;
                 }
                 this.draw_a_moon(Auto);
                 //自动的话显示评论
                 if(Auto)
                     this.ShowContent();
                 //右键转为自动模式,左键显示过期评论
                 $(this.moonEl).mousedown(function(e)
                 { 
                  if(e.which==3)
                    {
                      var status=($(this).attr('auto')=='false');
                      CB_comment.draw_a_moon(status);
                      $(this).attr('auto',status);
                    }
                  CB_comment.ShowContent();
                  return false;
                 });
                 // 取消默认右键打开上下文菜单
                 $(this.moonEl).bind('contextmenu',function(e){
                     return false;
                 });
                 Log('leave init_Comment');
             }// function init_Comment
         },// var CB_comment

         CB_Widget={
             //总元素
             widgetEl:$('<div/>'),
             // 侧边评论div
             sideEl:$('<div/>').attr('id','sideDiv'),
             // 收藏列表
             favs:[],
             // 标志是否显示收藏
             showFav:false,
             // 拖动支持
             Div_X:0,Div_Y:0,isStartDrag:false,isDivMove:false,
             // css
             Widget_CSS:'#widgetDiv{overflow:hidden;position:fixed;top:100px;left:50px;height:auto;width:auto;z-index: 10000;} .Widgets{text-align: center;color:white;background-color:#0320b0;width:36px;height:36px;cursor:pointer;margin-bottom: 2px;} #add_fav{background:url("http://su.bdimg.com/static/pack/img/menubar_bg_tm_1ff32815.png") -44px -38px;} '
             +'#show_fav{background:url("http://su.bdimg.com/static/pack/img/menubar_bg_tm_1ff32815.png")} #quick_comment{background:url("http://su.bdimg.com/static/pack/img/menubar_bg_tm_1ff32815.png") -44px -76px;}' +
             '#sideDiv{position:fixed;top:100px;left:90px;border-radius: 3px;height:160 px;z-index: 10000;}  .art_title{height:20px;cursor:pointer;display: inline;} #go_home{background:url("http://su.bdimg.com/static/pack/img/menubar_bg_tm_1ff32815.png") -44px -115px;}'+
             '.tipsy { padding: 5px; font-size: 10px; position: absolute; z-index: 100000; } \
.tipsy-inner { padding: 5px 8px 4px 8px; background-color: black; color: white; max-width: 400px; text-align: center; } \
.tipsy-inner { border-radius: 3px; -moz-border-radius:3px; -webkit-border-radius:3px; } \
.tipsy-arrow { position: absolute; background: url("http://ie.cnbeta.com/images/archivePopUp-tip.png") no-repeat top left; width: 9px; height: 5px; } \
.tipsy-n .tipsy-arrow { top: 0; left: 50%; margin-left: -4px; } \
.tipsy-nw .tipsy-arrow { top: 0; left: 10px; } \
.tipsy-ne .tipsy-arrow { top: 0; right: 10px; } \
.tipsy-s .tipsy-arrow { bottom: 0; left: 50%; margin-left: -4px; background-position: bottom left; } \
.tipsy-sw .tipsy-arrow { bottom: 0; left: 10px; background-position: bottom left; } \
.tipsy-se .tipsy-arrow { bottom: 0; right: 10px; background-position: bottom left; } \
.tipsy-e .tipsy-arrow { top: 50%; margin-top: -4px; right: 0; width: 5px; height: 9px; background-position: top right; } \
.tipsy-w .tipsy-arrow { top: 50%; margin-top: -4px; left: 0; width: 5px; height: 9px; } \
',
             // 初始化总侧边工具
             init_widget:function()
             {
             //读取位置
             this.Div_X=GM_getValue('DivX',50);
             this.Div_Y=GM_getValue('DivY',100);
             //添加
             this.widgetEl.attr('id','widgetDiv').html('<div style="background-color:#6FD1F0;font-size:20px;" class="Widgets" id="Back" title="恢复" >原</div>'+
             '<div title="添加收藏" class="Widgets" id="add_fav" ></div><div class="Widgets" id="show_fav"><a title="显示收藏"></a></div><div title="快速评论"  class="Widgets" id="quick_comment"></div>'+
             '<div  style="font-size:20px" title="5*2" class="Widgets" id="P5">+5</div><div title="-5*2"  style="font-size:20px" class="Widgets" id="N5">-5</div><div title="业界喷水网" class="Widgets" id="go_home"></div>'+
             '<div style="background-color:#6FD1F0;font-size:20px;" class="Widgets" id="MoveMe" title="自由移动" >移</div>');
             this.sideEl.html('<textarea id="comment_text1" style="border:1px solid ;background-color: transparent; margin-top: 0px; margin-bottom: 0px; height: 120px;width:70px;display:block; " placeholder="填写评论" ></textarea>'+
             '<img id="safecode1" style="display:block;width:70px;margin-top: 5px;" /> <input style="margin-top: 5px; width:70px;display:none;" type="text" id="vcode1" />');
             this.sideEl.hide();
             //设置位置
             $(this.widgetEl).css('top',CB_Widget.Div_Y).css('left',CB_Widget.Div_X);
             $('body').append(this.widgetEl);
             $('body').append(this.sideEl);
             
             
         },
         init:function()
         {
             this.init_widget();
             this.init_Favs();
             this.init_mark();
             this.init_comment(); 
             this.init_move();
             //提示
             $('.Widgets').not('#show_fav').tipsy({gravity: 'w'});
             $("#go_home").click(function(){location.replace('/');});
         },
         //初始化移动
         init_move:function()
         {
             //点击的话直接还原,向外边提供函数
             uWin.resetOffset=function(){GM_setValue('DivX',50);GM_setValue('DivY',100);};
             //单击还原
             $('#MoveMe').click(function()
             {
                if(CB_Widget.isDivMove)
                    {CB_Widget.isDivMove=false;return false;}
                CB_Widget.Div_X=50;
                CB_Widget.Div_Y=100;
                $(CB_Widget.widgetEl).css({'top':CB_Widget.Div_Y,'left':CB_Widget.Div_X});

            });
             var offSetY=0;
             //处理移动 开始移动
             $('#MoveMe').mousedown(function(e)
             {
                offSetY=e.clientY-CB_Widget.Div_Y;
                Log('clientY:' + e.clientY +',Div_Y:'+CB_Widget.Div_Y + ',y:'+offSetY);
                CB_Widget.isStartDrag=true;
                return true;
            });
             // 移动结束,回写
             function _x(e)
             {
                 Log('enter mouseleave or mouseup');
                 if(CB_Widget.isStartDrag){
                     CB_Widget.isStartDrag=false;
                     GM_setValue('DivX',CB_Widget.Div_X);
                     GM_setValue('DivY',CB_Widget.Div_Y);
                 }
                 return true;
             }
             $('#MoveMe').mouseup(_x);
             $('#MoveMe').mouseleave(_x);
             // 移动中
             $('#MoveMe').mousemove(function(e)
            {
                //Log('enter mousemove');
                if(!CB_Widget.isStartDrag)return true;
                CB_Widget.isDivMove=true;
                CB_Widget.Div_X=e.clientX-15;
                CB_Widget.Div_Y=e.clientY-offSetY;
                //Log("y:"+CB_Widget.Div_Y);
                $(CB_Widget.widgetEl).css('top',CB_Widget.Div_Y).css('left',CB_Widget.Div_X);
                return true;
            });
        },
         // 初始化评论按钮
         init_comment:function()
        {
             // 评论框在指针到达时开始显示
             $('#quick_comment').mouseover(
                function(){
                 $(CB_Widget.sideEl).css('top',CB_Widget.Div_Y).css('left',CB_Widget.Div_X+40);
                 CB_Widget.sideEl.show();
                 $('#comment_text1').focus();
             }).click(function(){
                 // 跳转到评论处
                 location.href='#top_reply_logout';
             });
             // 键盘和鼠标关掉评论框
             $('body').keydown(function(e){
                 if(e.which==27)
                     CB_Widget.sideEl.hide();
                 return true;
             });
             $('body').mousedown(function(e){
                 if(e.which==1)
                     CB_Widget.sideEl.hide();
                 return true;
             });
             // 刷新验证码
             function _imgload()
             {
                 $.ajax({
                     url: "\/captcha.htm?refresh=1",
                     dataType: 'json',
                     cache: false,
                     success: function(data) {
                         $('#safecode1').attr('src', data.url);
                         $('body').data('captcha.hash', [data.hash1, data.hash2]);
                     }
                 });
                 return false;
             }
             $('#safecode1').click(_imgload);
             // 处理回车显示验证码发送
             $('#comment_text1').keydown(function(e){
                 switch(e.which)
                 { case 13:
                         //uWin.reloadcode(1);
                         _imgload();
                         $('#vcode1').show();
                         $('#vcode1').focus();
                         break;
                     case 27:
                         CB_Widget.sideEl.hide();
                         break;
                     default:
                         return true;
                 }
                 return false;
             });
             //发送评论
             $('#vcode1').keydown(function(e){
                 if(e.which==13)
                 {
                     var id = Article.id;
                     //把 内容写到对应位置,发送
                     $('.form_input').attr('value',$(this).attr('value'));
                     $('textarea[name="nowcomment"]').attr('value',$('#comment_text1').attr('value'));
                     $('#post_btn').click();
                     CB_comment.TipAdd('快速评论ing！！');
                     CB_Widget.sideEl.hide();
                     return false;
                 }
                 else return true;
             });
        },
         // 打分
         init_mark:function()
        {
             $('#P5').click(function(){
                 $('li[data-score=5]').click();
                 CB_comment.TipAdd('5打分OK！！');
             });
             $('#N5').click(function(){
                 $('li[data-score=-5]').click();
                 CB_comment.TipAdd('-5打分OK！！');
             });
        },
         init_Favs:function()
         {
             //收藏,从设置中获取
             this.favs=GM_getValue('favs','[]');
             if(this.favs =='undefined')this.favs=[];
             else{
                 try{this.favs=JSON.parse(this.favs);}
             catch(e)
             {this.favs=[];}
            }
             // 添加到收藏
             $('#add_fav').click(function(){
                 Log('click add_fav');
                 if(CB_Widget.isDivMove)
                 {CB_Widget.isDivMove=false;return false;}
                 CB_Widget.sideEl.hide();
                 var id = Article.id;
                 //判断是否已存在
                 if((CB_Widget.favs.join(',')+',').indexOf(id+',')>-1)
                 {
                     CB_comment.TipAdd('文章id:'+id+'已收藏!');
                     return false;
                 }
                 //否则添加
                 CB_comment.TipAdd('收藏文章id'+id+'成功!');
                 CB_Widget.favs.push([id,Article.title]);
                 GM_setValue('favs',JSON.stringify(CB_Widget.favs));
             });
             // 点击的话关闭
             $('#show_fav').click(function(){
                 CB_Widget.sideEl.hide();
                 CB_Widget.showFav=!CB_Widget.showFav;
                 $('#show_fav').tipsy(CB_Widget.showFav?'show':'hide');
             });
             //控制显示和关闭
             $('#show_fav').mouseover(function(){
                 $('#show_fav a').tipsy('show');
             });
             $('#show_fav').mouseout(function(){
                 $('#show_fav a').tipsy('hide');
             });
             //显示列表
             $('#show_fav a').tipsy({gravity: 'w'});
             $('#show_fav').tipsy({gravity: 'w',html:true,trigger: 'manual',title:function(){
                 var s='';
                 for (var i in CB_Widget.favs)
                     s+='<dd><div class="art_title" onclick="location.href=\'/articles/'+CB_Widget.favs[i][0]+'.htm\';" >'+ CB_Widget.favs[i][1]+'</div><strong class="del" refid="'+CB_Widget.favs[i][0]+'" >X</strong>';
                 return s;
             }});
             //删除
             $('.del').live('click',function()
             {
                for(var  i in CB_Widget.favs)
                    if( CB_Widget.favs[i][0].toString() == $(this).attr('refid'))
                    {
                        CB_comment.TipAdd('删除收藏文章id'+CB_Widget.favs[i][0]+'成功!');
                        CB_Widget.favs.splice(i,1);
                        GM_setValue('favs',JSON.stringify(CB_Widget.favs));
                        $('#show_fav').tipsy('hide');
                        break;
                    }
                });
         }
     },//CB_Widget
     HomePage={
        CSS:'.alllist .realtime_list{padding:0;}.alllist .realtime_list .update_time{right:10px !important;} .hate{opacity: .2;} .listtop{padding: 4px 6px;cursor: pointer;}'+
        '.realtime_list dt{width:100% !important} .CBset{margin-top:10px;padding:4px 0 0 10px !important;} #CBSwitch input[type=checkbox]{margin-left:8px;}',
        isOrig:false,
         isChange:false,
         OpenNew:false,//是否打开新窗
         hateTopic:'',//默认过滤
         //过滤标题
         filter:function()
        {
            if(HomePage.hateTopic=='')return;
            var reg=new RegExp(HomePage.hateTopic);
            $('.alllist dl').each(function(){var x=$(this);if(x.find('dt a').html().search(reg)>-1)x.addClass('hate');});
            $('#allnews_all .items_area').on('DOMNodeInserted',
               function(e)
               {
                   if(e.target.nodeName!='DL')return true;
                   var x=$(e.target);
                   if(x.find('dt a').html().search(reg)>-1)x.addClass('hate');
               });
        },
        setting:function()
        {
            //获取过滤字符
            this.hateTopic=GM_getValue('hateTopic','小米');
            //添加设置页
            $('<li/>').addClass('tab_item').html('<a class="two">设置</a>').appendTo($('.cb_box:last nav ul'));
            // 设置界面
            var s='<p class="notice CBset" >文章标题过滤:多个关键词用|隔开<br/>'+
                '<input id="filterIn" style="width:150px" type="text" placeholder="多个关键词用|隔开" /><button id="filterOk">保存</button></p>'+
                '<p class="notice CBset" id="CBSwitch">开关(刷新生效)<br/>'+
                '<input type="checkbox" name="global" />全局<input type="checkbox" name="share" />分享</p>';
            var a=$('<div/>').attr('id','side_set').hide().appendTo($('.side_news_list'));
            a.html(s);
            a.find(':checkbox').click(function(){GM_setValue($(this).attr('name'),this.checked);}).each(
                function(){if(GM_getValue($(this).attr('name'),true))$(this).attr('checked','true');});
            $('#filterIn').val(this.hateTopic);
            $('#filterOk').click(
                function()
                {
                    GM_setValue('hateTopic',$('#filterIn').val());
                    alert('设置成功,刷新生效');
                }
            );
            //必须调用原win的jQuery
            function set(){uWin.jQuery('.side_news_nav').tabs('.side_news_list>div',{event:'mouseover'});};
            uWin.setTimeout(set,1000);
            $('#setting').click(set);
        },
        init:function()
        {
            this.OpenNew=GM_getValue('OpenNew',false);//新窗
            this.isOrig=GM_getValue('org',false);//是否是原始风格
            
            //恢复官方样式
            var Original_Style=function()
            {
                if(!HomePage.isChange)return;
                $('.realtime').parent().find(':first').before($('.hotpush'));
                $('.main_content_left > section').show();
                $('.content_body .realtime').append($('.realtime_list'));
            };
            //精简样式
            var New_Style=function(){
                HomePage.isChange=true;
                $('#allnews_all .items_area :first').before($('.realtime_list'));
                $('.realtime_list').before($('.hotpush'));
                $('.main_content_left > section').not(':last').hide();
            };
            // 修改样式
            var do_change=function()
            {
                if(HomePage.isOrig)
                {
                    Original_Style();
                    $('#Back').html('改');
                    $('#Back').attr('title','修改');
                }
                else{New_Style();
                     $('#Back').html('原');
                     $('#Back').attr('title','恢复');
                    }
            };
            do_change();
            $('.allinfo .blue_bar').append($('.J_realtime').clone());
            var s='<span id="setting" class="fr listtop">设置</span>'+
                '<span class="fr listtop"><input type="checkbox" id="OpenNew" '+(this.OpenNew?'checked="true"':'')+ ' />新</span>';
            $('.allinfo .blue_bar').append(s);
            // 新窗按钮的事件
            function target(){if(HomePage.OpenNew)
                $('a[target="_blank"]').attr('target','');
                else $('a[target=""]').attr('target','_blank');
                HomePage.OpenNew=!HomePage.OpenNew;
                GM_setValue('OpenNew',HomePage.OpenNew);
            }                                               
            $('#OpenNew').click(target);
            this.OpenNew=!this.OpenNew;
            target();
            //左侧的widget修正
            $('#widgetDiv > *').not('#show_fav').not('#MoveMe').not('#Back').remove();
            $('#Back').click(
                function()
                {
                    HomePage.isOrig=!HomePage.isOrig;
                    GM_setValue('org',HomePage.isOrig);
                    do_change();
                }
            );
            // 打开设置和过滤
            this.setting();
            this.filter();
        }
    },
    CB_share={
        // 分享,来自 自古CB出评论脚本
        //sina_url:'http://service.weibo.com/share/share.php?title={{title}}&url={%url%}&appkey=696316965',
        CSS:'.genPic{margin-left:10px;cursor:pointer;color:#EB192D;}',
        templateO:'{%comment%} ——「{%title%} {%tag%}',
        template:GM_getValue('template','{%comment%} ——「{%title%}」 {%tag%}'),
        init:function()
        {
            $('.hotcomments').on('DOMNodeInserted',
               function(e)
               {

                   if(e.target.nodeName!='LI')return true;
                   var t=$(e.target);
                   if(t.find('.genPic').length>0)return true;
                   var con= $(e.target).find('em').html();
                   //对字数多的出现生成长图按钮
                   if(con.length>140){
                       var n=$('<span/>').addClass('genPic').html('生成长图');
                       t.find('.title .time').after(n);}
                       return true;
                });
            //控制分享内容
            $('#popshare li a').attr('onclick','').live('click',function(){
                var tid = $(this).parents("#popshare").attr('data-tid');
                var conNode=$('#hotcon'+tid);
                var sharetitle=
                    CB_share.template.replace('{%comment%}',conNode.html().substr(0,80))
                .replace('{%title%}',Article.title)
                .replace('{%tag%}','#自古CB出评论# #CB评论#')
                .replace('{%tag1%}','#自古CB出评论#')
                ;
                var op={title:sharetitle,content:sharetitle};
                var pic=conNode.attr('pic');
                newopen=uWin.open;
                // 如果有图片,必须加上,通过hook open实现,通用性较低,新浪微博和qq可用
                if(pic)
                {
                    op.pic=pic;
                    uWin.open=function(a,b,c){if(b=='cnbetashare')a=a+'&pic='+pic+'&pics='+pic;newopen(a,b,c)};
                }
                uWin.shareJump(this,op);
                uWin.open=newopen;
            });
            $('.genPic').live('click',function()
            {
              var conNode=$(this).parents('div.comContent').find('em');
              var title=conNode.html();
              //获取长图的按钮
              var pic=null;
              GM_xmlhttpRequest({
                  timeout:1000*30,
                  method: "POST",
                  url:'http://www.taichangle.com/taichangle.php',
                  data:'text='+encodeURIComponent(title),
                  headers: {
                      "Content-Type": "application/x-www-form-urlencoded"
                  },
                  synchronous:true,
                  onload: function(response) {
                      var data=JSON.parse(response.responseText);
                      if(data.errno==0)
                      {
                          pic='http://www.taichangle.com/'+data.image_url;
                          CB_comment.TipAdd('长图获取成功!');
                      }
                      else
                      {
                          CB_comment.TipAdd('长图获取失败:'+data.error);
                      }
                      if(pic)
                      {
                          conNode.attr('pic',pic);
                      }
                  }
              });
            return false;
            });
            $('.hotcomments header').append('<button class="fr" id="changeTemp">更改分享模板</button>');
            //参考 自古CB出评论 添加了官方的标签
            $('#changeTemp').click(function(){
                var template_input = window.prompt("「自古CB出评论」模板设置\n\n可用变量：\n{%title%} - 文章标题；\n{%comment%} - 评论正文；\n"+
                    "{%tag%} - 标签；\n{%tag1%} - 单标签；\n\n默认值：" + CB_share.templateO + "\n\n", CB_share.template);
                if (template_input !== null && CB_share.template !== template_input) {
                    GM_setValue("template", template_input);
                    CB_share.changeTemp(template_input);
                    
                }
            });
        },
        changeTemp:function(s)
        {
            CB_share.template=s;
        }
    };
    //去除广告,建议是使用adp去除的
function RemoveAD ()
{
    Log('enter AdRemove');
    $('script').each(function(){if(this.src)return;if(this.src.match('baidu|google')||$(this).html().match('baidu|google'))$(this).remove();});
    $('iframe').remove();
    $('div[id*=baidu]').remove();
    $('div[id*=tanxssp]').remove();
    $('.adsbygoogle').remove();
}
function init()
{
    Log('enter init');
    if($('#CBset').length>0)return;
    if($('#widgetDiv').length>0)return;
    window.setTimeout(RemoveAD,2000);
    var isMainPage=isNaN(Article.id);
    //如果全局打开的
    if(GM_getValue('global',true))
    {
        MustAddStyle(CB_comment.GETTER_STYlE+CB_Widget.Widget_CSS+HomePage.CSS+CB_share.CSS);
        CB_Widget.init();
        if(isMainPage)
        {
            HomePage.init();
            return;
        }
        $('#Back').remove();
        $('.cb_box a[target="_blank"]').attr('target','');
        CB_comment.init_Comment();
        if(GM_getValue('share',true))//分享
        CB_share.init();
    }
    else//否则只显示设置
        {
            MustAddStyle(HomePage.CSS);
            if(isMainPage)HomePage.setting();
        }
} 

// 运行
RemoveAD();
init();
window.setTimeout(init,1000);
}
)();