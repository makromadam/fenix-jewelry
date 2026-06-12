/* ============================================================
   FENIX JEWELRY — catalog data (presentation placeholders)
   ============================================================ */
window.FENIX = (function(){
  var HERO = ['assets/img/hero1.png','assets/img/hero2.png','assets/img/hero3.png','assets/img/hero4.png'];
  var PLACEHOLDER = 'assets/img/image-placeholder.png';

  var categories = {
    rings:{label:'Collection', title:'Rings', sub:'', code:'RG',
      img:'assets/img/rings-hero.png', pos:30, hero:'assets/img/rings-hero.png', heroPos:'center 30%',
      type:'Solitaire', intro:'A vow you can hold — solitaires and bands cut to hold the light for a lifetime.'},
    necklaces:{label:'Collection', title:'Necklaces', sub:'', code:'NK',
      img:'assets/img/necklaces-hero.png', pos:30, hero:'assets/img/necklaces-hero.png', heroPos:'center 30%',
      type:'Rivière', intro:'Light strung along the throat — pendants and rivières set to catch every flame in the room.'},
    bracelets:{label:'Collection', title:'Bracelets', sub:'', code:'BC',
      img:'assets/img/bracelets-hero.png', pos:28, hero:'assets/img/bracelets-hero.png', heroPos:'center 28%',
      type:'Cuff', intro:'Fire around the wrist — cuffs, chains and tennis lines that move with every gesture.'},
    earrings:{label:'Collection', title:'Earrings', sub:'', code:'ER',
      img:'assets/img/earrings-hero.png', pos:26, hero:'assets/img/earrings-hero.png', heroPos:'center 26%',
      type:'Drop', intro:'Fire that frames the face — from quiet solitaire studs to chandelier drops that move like flame.'},
    bridal:{label:'Collection', title:'Bridal', sub:'', code:'BR',
      img:'assets/img/bridal-hero.png', pos:28, hero:'assets/img/bridal-hero.png', heroPos:'center 28%',
      type:'Suite', intro:'For the day everything begins — matched suites and sets for the ones who wear the fire forever.'},
    gemstones:{label:'Collection', title:'Gemstones', sub:'', code:'GM',
      img:'assets/img/gemstones-hero.png', pos:30, hero:'assets/img/gemstones-hero.png', heroPos:'center 30%',
      type:'Sapphire', intro:'Colour drawn straight from the flame — sapphires, emeralds and rubies chosen for their fire.'},
    'high-jewelry':{label:'Haute Joaillerie', title:'High Jewelry', sub:'', code:'HJ',
      img:'assets/img/high-jewelry-hero.png', pos:28, hero:'assets/img/high-jewelry-hero.png', heroPos:'center 24%',
      type:'Parure', intro:'The atelier at its most daring — one-of-a-kind pieces built around extraordinary stones.'},
    gifts:{label:'The Gift Edit', title:'Gifts', sub:'', code:'GF',
      img:'assets/img/gifts-hero.png', pos:30, hero:'assets/img/gifts-hero.png', heroPos:'center 30%',
      type:'Pendant', intro:'Fire made to give — pieces chosen to mark the moments that matter.'}
  };

  var NAMES = ['Ember','Molten','Phoenix','Cinder','Aurora','Solstice','Seraph','Vesper','Halcyon','Lumen',
               'Ignis','Pyre','Solara','Calyx','Astra','Noctis','Helia','Solene','Étoile','Verity'];
  var TYPES = {necklaces:['Rivière','Pendant','Collar','Lariat'],earrings:['Drop','Stud','Chandelier','Huggie'],
               rings:['Solitaire','Band','Halo','Trilogy'],bracelets:['Cuff','Chain','Bangle','Tennis'],
               bridal:['Suite','Set','Tiara','Bridal Ring'],gemstones:['Sapphire','Emerald','Ruby','Spinel'],
               'high-jewelry':['Parure','Necklace','Earring','Ring'],gifts:['Pendant','Studs','Charm','Band']};
  var TAGS=['Signature','New','Atelier','14K Gold','18K Gold'];
  var METALS=[['18K','18K Yellow Gold'],['14K','14K White Gold'],['18K','18K Rose Gold'],['Platinum','Platinum 950']];
  var FINISH=['High polish','Brushed matte','Hammered','Milgrain edge','Bezel-set'];

  function buildProducts(key, n){
    var cat = categories[key] || categories.rings;
    var types = TYPES[key] || TYPES.rings;
    var out=[];
    for(var i=0;i<n;i++){
      var base=NAMES[i%NAMES.length];
      var type=types[i%types.length];
      var metal=METALS[i%METALS.length];
      var carat=[0.5,0.9,1.2,1.6,2.1,2.8,3.4,4.0][i%8];
      var priceNum=4200 + ((i*7919)%26000) + Math.round(carat*3600);
      var price='$'+priceNum.toLocaleString('en-US');
      var tag=(key==='new' && i<4)?'New':TAGS[i%TAGS.length];
      var num=('00'+(i+1)).slice(-3);
      out.push({
        id:i,
        name:base+' '+type,
        code:'FNX-'+cat.code+'-'+num,
        tag:tag,
        price:price, priceNum:priceNum,
        metal:metal[0], metalLabel:metal[1],
        carat:carat,
        gia:'GIA '+(2200000000 + i*131071),
        finish:FINISH[i%FINISH.length],
        img:PLACEHOLDER,
        pos:50,
        feat:(i*2654435761>>>0)%100
      });
    }
    return out;
  }

  var STORIES=[
    'Drawn from a single pour of molten gold, then cooled slowly so the metal keeps its quiet weight. The stone was chosen by hand for the way it holds a flame at its centre.',
    'Born in the heat of the atelier and finished over weeks, not hours. Every facet is angled to catch fire from across a room and hold it.',
    'A piece made to outlive the moment it marks — gold that stays, a diamond that never tires of the light, a form pared back to its essence.',
    'Held still between heat and patience. The fire gives the metal its life; the hand gives it its meaning. Worn once, kept forever.'
  ];

  return {
    HERO:HERO, categories:categories, buildProducts:buildProducts,
    story:function(i){return STORIES[i%STORIES.length];}
  };
})();
