/* 31/06/15: XW FAQ with Garven Dreis 
TODO: desactivate  and unwrapping.
Unit.prototype for old pilots and upgrades
*/

var UPGRADE_TYPES={
    Elite:"ept",Torpedo:TORPEDO,Astromech:"amd",Turret:"turret",Missile:"missile",Crew:"crew",Cannon:"cannon",Bomb:"bomb",Title:"title",Mod:"mod",System:"system",Illicit:"illicit",Salvaged:"salvaged",Tech:"tech"
};
function AUXILIARY(i,m) { return this.getPrimarySectorString(i,m.clone().rotate(this.arcrotation,0,0));};
function SUBAUXILIARY(i,j,m) { return this.getPrimarySubSectorString(i,j,m.clone().rotate(this.arcrotation,0,0)); }
function Laser(u,type,fire) {
    switch(type) {
    case "Bilaser":
    case "Mobilelaser":
	return new Weapon(u,{
	    type: type,
	    name:"Laser",
	    isactive:true,
	    attack: fire,
	    range: [1,3],
	    isprimary: true,
	    issecondary:false,
	    auxiliary: AUXILIARY,
	    subauxiliary: SUBAUXILIARY
	});
    case "Laser180":
	return new Weapon(u,{
	    type: type,
	    name:"Laser",
	    isactive:true,
	    attack: fire,
	    range: [1,3],
	    isprimary: true,
	    issecondary:false,
	    auxiliary: function(i,m) { return this.getHalfRangeString(i,m); },
	    subauxiliary: function(i,j,m) { return this.getHalfSubRangeString(i,j,m); }
	});	
    default: return new Weapon(u,{
	type: type,
	name:"Laser",
	isactive:true,
	attack: fire,
	range: [1,3],
	isprimary: true,
	issecondary:false,
    });
    }
}
function Bomb(sh,bdesc) {
    $.extend(this,bdesc);
    sh.upgrades.push(this);
    this.isactive=true;
    this.wrapping=[];
    this.unit=sh;
    sh.bombs.push(this);
    this.exploded=false;
    //if (this.init != undefined) this.init(sh);
}
Bomb.prototype = {
    isWeapon: function() { return false; },
    isBomb: function() { return true; },
    canbedropped: function() { return this.isactive&&!this.unit.hasmoved&&this.unit.lastdrop!=round; },
    desactivate:Unit.prototype.desactivate,
    getBall: function() {
	var b=this.g.getBBox();
	return {x:b.x+b.width/2,y:b.y+b.height/2,diam:Math.max(b.width/2,b.height/2)};
    },
    actiondrop: function(n) {
	this.unit.lastdrop=round;
	$(".bombs").remove(); 
	this.drop(this.unit.getbomblocation(),n);
	//this.unit.showactivation();
    },
    toString: function() {
	this.tooltip = formatstring(getupgtxttranslation(this.name,this.type));
	this.trname=translate(this.name).replace(/\'/g,"&#39;");
	this.left=(this.unit.team==1);
	return Mustache.render(TEMPLATES["bomb"], this);
    },
    getrangeallunits: function () { 
	var range=[[],[],[],[],[]],i;
	for (i in squadron) {
	    var sh=squadron[i];
	    var k=this.getrange(sh);
	    if (k>0) range[k].push({unit:i});
	};
	return range;
    },
    getcollisions: function() {
	var ob=this.getOutlineString();
	var p=[];
	for (i in squadron) {
	    var u=squadron[i];
	    var so=u.getOutlineString(u.m);
	    os=so.s;
	    op=so.p;
	    if (Snap.path.intersection(ob.s,os).length>0 
		||this.unit.isPointInside(ob.s,op)
		||this.unit.isPointInside(os,ob.p)) {
		p.push(u); 
	    }

	}
	return p;
    },
    getrange: function(sh) { 
	var ro=this.getOutlineString(this.m).p;
	var rsh = sh.getOutlinePoints(sh.m);
	var min=90001;
	var i,j;
	var mini,minj;
	for (i=0; i<ro.length; i++) {
	    for (j=0; j<4; j++) {
		var d=dist(rsh[j],ro[i]);
		if (d<min) min=d
	    }
	}
	if (min>90000) return 4;
	if (min<=10000) return 1; 
	if (min<=40000) return 2;
	return 3;
    },
    resolveactionmove: function(moves,cleanup) {
	var i;
	this.pos=[];
	var ready=false;
	var resolve=function(m,k,f) {
	    for (i=0; i<moves.length; i++) this.pos[i].remove();
	    this.m=m;
	    f(this,k);
	}.bind(this);
	if (moves.length==1) {
	    this.pos[0]=this.getOutline(moves[0]).attr({fill:this.unit.color,opacity:0.7});
	    resolve(moves[0],0,cleanup);
	} else {
	    for (i=0; i<moves.length; i++) {
		this.pos[i]=this.getOutline(moves[i]).attr({fill:this.unit.color,opacity:0.7});
		(function(k) {
		    this.pos[k].hover(
			function() {this.pos[k].attr({stroke:this.unit.color,strokeWidth:"4px"})}.bind(this),
			function() {this.pos[k].attr({strokeWidth:"0"})}.bind(this));
		
		    this.pos[k].click(
		    function() { resolve(moves[k],k,cleanup); });}.bind(this)
		)(i);
	    }
	}
    },
    drop: function(lm,n) {
	var dropped=this;
	if (this.ordnance) { 
	    this.ordnance=false; 
	    dropped=$.extend({},this);
	} else this.desactivate();
	dropped.resolveactionmove(this.unit.getbombposition(lm,this.size), function(k) {
	    this.display(0,0);
	    this.unit.bombdropped(this);
	    //this.unit.log("endaction dropped "+n);
	    if (typeof n!="undefined") this.unit.endnoaction(n,"DROP");
	}.bind(dropped),false,true);
    },
    display: function(x,y) {
	if (x!=0||y!=0) this.m=this.m.clone().translate(x,y);
	this.img1=s.image("png/"+this.img,-this.width/2,-this.height/2,this.width,this.height);
	this.outline=this.getOutline(new Snap.Matrix())
	    .attr({display:"block","class":"bombanim",stroke:halftone(BLUE),strokeWidth:2,fill:"rgba(8,8,8,0.3)"});
	this.g=s.group(this.outline,this.img1);
	this.g.hover(function () { 
	    var m=VIEWPORT.m.clone();
	    var w=$("#svgout").width();
	    var h=$("#svgout").height();
	    var startX=0;
	    var startY=0;
	    if (h>w) startY=(h-w)/2;
	    else startX=(w-h)/2;
	    var max=Math.max(900./w,900./h);
	    
	    var bbox=this.g.getBBox();
	    var p=$("#svgout").position();
	    var min=Math.min($("#playmat").width(),$("#playmat").height());
	    var x=m.x(bbox.x,bbox.y-20)/max;
	    x+=p.left+startX;
	    var y=m.y(bbox.x,bbox.y-20)/max;
	    y+=p.top+startY;
	    this.outline.attr({stroke:BLUE});
	    $(".info").css({left:x,top:y}).html(this.name).appendTo("body").show();
	}.bind(this), function() { 
	    $(".info").hide(); 
	    this.outline.attr({stroke:halftone(BLUE)});
	}.bind(this));
	this.g.transform(this.m);
	this.g.appendTo(VIEWPORT);
	this.g.attr("display","block");
	BOMBS.push(this);
	if (this.stay) {
	    OBSTACLES.push(this);
	    var p=this.getcollisions();
	    if (p.length>0) this.unit.resolveactionselection(p,function(k) {
		this.detonate(p[k]);
	    }.bind(this));
	}
    },
    getOutline: function(m) {
	return s.path(this.getOutlineString(m).s).appendTo(VIEWPORT);
    },
    getOutlineString: function(m) {
	var w=15;
	if (typeof m=="undefined") m=this.m;
	var p1=transformPoint(m,{x:-w-1,y:-w});
	var p2=transformPoint(m,{x:w+1,y:-w});
	var p3=transformPoint(m,{x:w+1,y:w});
	var p4=transformPoint(m,{x:-w-1,y:w});	
	this.op=[p1,p2,p3,p4];
	var p=this.op;
	return {s:"M "+p[0].x+" "+p[0].y+" L "+p[1].x+" "+p[1].y+" "+p[2].x+" "+p[2].y+" "+p[3].x+" "+p[3].y+" Z",p:p}; 
    },
    explode_base: function() {
	this.exploded=true;
	this.unit.log("%0 explodes",this.name);
	SOUNDS[this.snd].play();
	this.g.remove();
	BOMBS.splice(BOMBS.indexOf(this),1);
    },
    explode: function() { this.explode_base(); },
    detonate: function() {
	OBSTACLES.splice(OBSTACLES.indexOf(this),1);
	this.explode_base();
    },
    endround: function() {},
    show: function() {},
    wrap_before: Unit.prototype.wrap_before,
    wrap_after: Unit.prototype.wrap_after,
}
function Weapon(sh,wdesc) {
    this.isprimary=false;
    this.issecondary=true;
    $.extend(this,wdesc);
    sh.upgrades[sh.upgrades.length]=this;
    this.wrapping=[];
    //log("Installing weapon "+this.name+" ["+this.type+"]");
    this.isactive=true;
    this.unit=sh;
    sh.weapons.push(this);
}
Weapon.prototype = {
    isBomb: function() { return false; },
    isWeapon: function() { return true; },
    desactivate:function() {
	if (this.ordnance&&this.type.match(/Torpedo|Missile/)) {
	    this.ordnance=false;
	} else Unit.prototype.desactivate.call(this);
    },
    toString: function() {
	this.tooltip = formatstring(getupgtxttranslation(this.name,this.type));
	this.trname=translate(this.name).replace(/\'/g,"&#39;");
	this.left=(this.unit.team==1);
	if (this.isactive) {
	    var i,r=this.getrangeallunits();
	    for (i=0; i<r.length; i++) if (r[i].isenemy(this.unit)) break;
	    if (i==r.length) this.nofire=true; else this.nofire=false;
	}
	this.attackkey=A[this.type.toUpperCase()].key;
	this.req=[];
	if ((typeof this.getrequirements()!="undefined")) {
	    if ("Target".match(this.getrequirements())) this.req.push([A["TARGET"].key]);
	    if ("Focus".match(this.getrequirements())) this.req.push(A["FOCUS"].key);
	}
	this.uid = squadron.indexOf(this.unit);
	this.rank=this.unit.upgrades.indexOf(this);
	return Mustache.render(TEMPLATES["weapon"], this);
    },
    prehit: function(t,c,h) {},
    posthit:function(t,c,h) {},
    getrequirements: function() {
	return this.requires;
    },
    getattack: function() {
	return this.attack;
    },
    isTurret: function() {
	return this.type==TURRET;
    },
    getlowrange:function() {
	return this.range[0];
    },
    gethighrange:function() {
	return this.range[1];
    },
    isinrange: function(r) {
	return (r>=this.getlowrange()&&r<=this.gethighrange());
    },
    modifydamagegiven: function(ch) { return ch; },
    modifyattackroll: function(ch,n,d) { return ch; },
    modifydamageassigned: function(ch,t) { return ch; },
    canfire: function(sh) {
	if (typeof sh=="undefined") console.log("undefined unit: "+this.unit.name+" "+this.name);
	if (!this.isactive||this.unit.isally(sh)) return false;
	if (this.unit.checkcollision(sh)) return false;
	if (typeof this.getrequirements()!="undefined") {
	    var s="Target";
	    if (s.match(this.getrequirements())&&this.unit.canusetarget(sh))
		return true;
	    s="Focus";
	    if (s.match(this.getrequirements())&&this.unit.canusefocus(sh)) return true;
	    return false;
	}
	return true;
    },
    getrangeattackbonus: function(sh) {
	if (this.isprimary) {
	    var r=this.getrange(sh);
	    if (r==1) {
		this.unit.log("+1 attack for range 1");
		return 1;
	    }
	}
	return 0;
    },

    declareattack: function(sh) { 
	if (typeof this.getrequirements()!="undefined") {
	    var s="Target";
	    var u="Focus";
	    if (s.match(this.getrequirements())&&this.consumes==true&&this.unit.canusetarget(sh))
		this.unit.removetarget(sh);
	    else if (u.match(this.getrequirements())&&this.consumes==true&&this.unit.canusefocus(sh)) 
		this.unit.removefocustoken();
	    this.unit.show();
	}
	return true;
    },
    getrangedefensebonus: function(sh) {
	if (this.isprimary) {
	    var r=this.getrange(sh);
	    if (r==3) {
		sh.log("+1 defense for range 3");
		return 1;
	    }
	}
	return 0;
    },
    getauxiliarysector: function(sh) {
	var m=this.unit.m;
	if (typeof this.auxiliary=="undefined") return 4;
	var n=this.unit.getoutlinerange(m,sh).d;
	for (var i=n; i<=n+1&&i<=3; i++) 
	    if (this.unit.isinsector(m,i,sh,this.subauxiliary,this.auxiliary)) return i;
	return 4;
    },
    getprimarysector: function(sh) {
	var m=this.unit.m;
	var n=this.unit.getoutlinerange(m,sh).d;
	for (var i=n; i<=n+1&&i<=3; i++) 
	    if (this.unit.isinsector(m,i,sh,this.unit.getPrimarySubSectorString,this.unit.getPrimarySectorString)) return i;
	return 4;
    },
    getsector: function(sh) {
	var m=this.unit.m;
	var n=this.unit.getoutlinerange(m,sh).d;
	for (var i=n; i<=n+1&&i<=3; i++) 
	    if (this.unit.isinsector(m,i,sh,this.unit.getPrimarySubSectorString,this.unit.getPrimarySectorString)) return i;
	if (typeof this.auxiliary=="undefined") return 4;
	for (var i=n; i<=n+1&&i<=3; i++) 
	    if (this.unit.isinsector(m,i,sh,this.subauxiliary,this.auxiliary)) return i;
	return 4;
    },
    getrange: function(sh) {
	var i;
	if (!this.canfire(sh)) return 0;
	if (this.isTurret()||this.unit.isTurret(this)) {
	    var r=this.unit.getrange(sh);
	    if (this.isinrange(r)) return r;
	    else return 0;
	}
	var ghs=this.getsector(sh);
	if (ghs>=this.getlowrange()&&ghs<=this.gethighrange()) return ghs;
	return 0;
    },
    endattack: function(c,h) {
	if (this.type.match(/Torpedo|Missile/)) this.desactivate();
    },
    hasdoubleattack: function() { return false; },
    hasenemiesinrange:function() {
	for (var i in squadron) {
	    var sh=squadron[i];
	    if (this.unit.isenemy(sh)&&this.getrange(sh)>0) return true;
	}
	return false;
    },
    getenemiesinrange: function(enemylist) {
	var r=[];
	if (typeof enemylist=="undefined") enemylist=squadron;
	for (var i in enemylist) {
	    var sh=enemylist[i];
	    if (this.unit.isenemy(sh)&&this.getrange(sh)>0) r.push(sh);
	}
	return r;
    },
    getrangeallunits: function() {
	var i;
	var r=[];
	for (i in squadron) {
	    var sh=squadron[i];
	    if ((this.unit!=sh)&&(this.getrange(sh)>0)) r.push(sh);
	}
	return r;
    },
    wrap_before: Unit.prototype.wrap_before,
    wrap_after: Unit.prototype.wrap_after,
    endround:function() {},
    show: function() {}
};
function Upgrade(sh,i) {
    $.extend(this,UPGRADES[i]);
    sh.upgrades.push(this);
    this.isactive=true;
    this.unit=sh;
    this.wrapping=[];
    /*
    var addedaction=this.addedaction;
    if (typeof addedaction!="undefined") {
	var added=addedaction.toUpperCase();
	sh.shipactionList.push(added);
    }
*/
    //if (typeof this.init != "undefined") this.init(sh);
}
function Upgradefromid(sh,i) {
    var upg=UPGRADES[i];
    upg.id=i;
    if (upg.type==BOMB) return new Bomb(sh,upg);
    if (typeof upg.isWeapon != "undefined") { 
	if (upg.isWeapon()) return new Weapon(sh,upg);
	else return new Upgrade(sh,i);
    }
    if (upg.type.match(/Turretlaser|Bilaser|Mobilelaser|Laser180|Laser|Torpedo|Cannon|Missile|Turret/)||upg.isweapon==true) return new Weapon(sh,upg);
    return new Upgrade(sh,i);
}
Upgrade.prototype = {
    toString: function() {
	this.tooltip = formatstring(getupgtxttranslation(this.name,this.type));
	this.trname=translate(this.name).replace(/\'/g,"&#39;");
	this.left=(this.unit.team==1);
	if (typeof this.shield!="undefined" &&this.shield>0) this.hasshield=true; else this.hasshield=false;
	if (typeof this.focus!="undefined" &&this.focus>0) this.hasfocus=true; else this.hasfocus=false;
	if (typeof this.switch!="undefined"&&phase==SETUP_PHASE) {
	    for (j=0; j<this.unit.upgrades.length; j++) if (this.unit.upgrades[j]==this) break;
	    this.hasswitch={uid:this.unit.id,uuid:j}
	} else this.hasswitch=false;
	return Mustache.render(TEMPLATES["upgrade"], this);
    },
    isWeapon: function() { return false; },
    isBomb: function() { return false; },
    getlowrange:function() {
	return this.range[0];
    },
    gethighrange:function() {
	return this.range[1];
    },
    endround: function() {},
    desactivate:function() {
	if (this.ordnance&&this.type.match(/Torpedo|Missile/)) {
	    this.ordnance=false;
	} else Unit.prototype.desactivate.call(this);
    },
    show: function() {},
    install: function(sh) {
	if (typeof this.addedaction!="undefined") {
	    var aa=this.addedaction.toUpperCase();
	    sh["addedaction"+this.id]=sh.shipactionList.length;
	    sh.shipactionList.push(aa);
	    sh.showactionlist();
	}
	// Adding upgrades
	if (typeof this.upgrades!="undefined") {
	    sh["addedupg"+this.id]=sh.upgradesno;
	    if (typeof this.pointsupg!="undefined") sh.upgbonus[this.upgrades[0]]=this.pointsupg;
	    if (typeof this.maxupg!="undefined") {
		sh.maxupg[this.upgrades[0]]=this.maxupg;
	    }
	    if (this.exclusive==true) {
		sh.exclupg[this.upgrades[0]]=true;
	    }
	    sh.upgradetype=sh.upgradetype.concat(this.upgrades);
	    sh.upgradesno=sh.upgradetype.length;
	    sh.showupgradeadd();   
	}
	// Losing upgrades
	if (typeof this.lostupgrades!="undefined") {
	    for (var j=0; j<sh.upgradetype.length; j++) {
		if (this.lostupgrades.indexOf(sh.upgradetype[j])>-1) {
		    if (sh.upg[j]>-1) removeupgrade(sh,j,sh.upg[j]);
		    sh.upg[j]=-2;
		}
	    }
	    sh.showupgradeadd();
	}
	// Emperor
	if (typeof this.takesdouble!="undefined") {
	    var j;
	    for (j=0; j<sh.upgradetype.length; j++){
		if (sh.upgradetype[j]==this.type&&(sh.upg[j]<0||UPGRADES[sh.upg[j]].name!=this.name)) {
		    break;
		}
	    }
	    if (j<sh.upgradetype.length) {
		if (sh.upg[j]>-1) removeupgrade(sh,j,sh.upg[j]);
		sh.upg[j]=-2;
	    }
	    sh.showupgradeadd();
	}
    },
    uninstall: function(sh) {
	if (typeof this.addedaction!="undefined") {
	    var aa=this.addedaction.toUpperCase();
	    sh.shipactionList.splice(sh["addedaction"+this.id],1);

	}
	if (typeof this.upgrades!="undefined") {
	    if (typeof this.pointsupg!="undefined") sh.upgbonus[this.upgrades[0]]=0;
	    if (typeof this.maxupg!="undefined") sh.maxupg[this.upgrades[0]]=0;
	    for (var i=0; i<this.upgrades.length; i++) {
		var num=i+sh["addedupg"+this.id];
		var e=$("#unit"+sh.id+" .upg div[num="+num+"]");
		if (e.length>0) {
		    var data=e.attr("data");
		    removeupgrade(sh,num,data);
		}
	    }
	    if (typeof this.exclusive==true) {
		sh.exclupg[this.upgrades[0]]=false;
	    }
	    sh.upgradetype.splice(sh["addedupg"+this.id],this.upgrades.length);
	    sh.upgradesno=sh.upgradetype.length;
	}
	if (typeof this.lostupgrades!="undefined") {
	    for (var i=0; i<sh.upgradetype.length; i++)
		if (this.lostupgrades.indexOf(sh.upgradetype[i])>-1)
		    sh.upg[i]=-1;
	}
	if (typeof this.takesdouble!="undefined") {
	    for (var i=0; i<sh.upgradetype.length; i++)
		if (sh.upgradetype[i]==this.type&&sh.upg[i]==-2)
		    sh.upg[i]=-1;
	}
    },
    wrap_before: Unit.prototype.wrap_before,
    wrap_after: Unit.prototype.wrap_after,

}

var rebelonly=function(p) {
    var i;
    for (i=0; i<PILOTS.length; i++) 
	if (p==PILOTS[i].name&&PILOTS[i].faction==REBEL) return true;
    return false;
}
var empireonly=function(p) {
    var i;
    for (i=0; i<PILOTS.length; i++) 
	if (p==PILOTS[i].name&&PILOTS[i].faction==EMPIRE) return true;
    return false;
}
