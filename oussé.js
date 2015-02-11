var posX = NaN; // dernière position X de la souris enregistrée dans l'évènement mousemove du canvas
var posY = NaN; // même chose pour la position Y
var boutDroitEnfonce = false; // vrai si le bouton droit de la souris est enfoncé dans le canvas
var chemin = "resource pack/"; // dossier où trouver les textures des blocs
var nbImgChargees = 0;

/* Définition de l'objet OusseRecherche - objet litéral*/
var ousseRecherche =
{
	nom: "cobblestone",
	resultat: [],
    definirRecherche: function(nom)
    {
        if(nom !== "")
        {
            this.effacer();
            ousseRecherche.nom = nom;
            return true;
        }

        return false;
    },
	ajouter: function(caseResultat)
	{
		this.resultat.push(caseResultat);
	},
	afficherResultat: function(context, marge)
	{
		for(var i = 0; i < this.resultat.length; i++)
		{
			var caseResultat = this.resultat[i];
            context.fillStyle = "rgba(255, 0, 0, 0.5)";
			context.fillRect((marge+this.resultat[i].longueur)*this.resultat[i].x, // position x de la case
                            (marge+this.resultat[i].hauteur)*this.resultat[i].z,  // position z de la case
                            this.resultat[i].longueur, // longueur de la case
                            this.resultat[i].hauteur); // largeur de la case
		}
	},
	effacer: function()
	{
		this.nom = "";
		this.resultat = [];
	}
};

/*
 Définition de l'objet Item
 Représente un item se trouvant dans une case
 */
function Item(nom)
{
	this.nom = nom;
}

/*
 Définition de l'objet Case
 x      : position x de la case
 z      : position z de la case
 nomImg : l'image à utiliser en tant que texture. Voir la fonction getTexture
 items (optionnel) : liste des items présents sur la case
 */
function Case(x, z, nomImg, items, longueur, hauteur)
{
	// Position
	this.x = x;
	this.z = z;
	
	// Longueur et hauteur
	this.longueur = longueur;
	this.hauteur = hauteur;

	// Texture représentant la case
	this.texture = new Image();
    this.texture.src = chemin+ nomImg+ ".png";
    this.texture.onload = function()
    {
        nbImgChargees++;
    };
	
	// Liste des items se trouvant sur cette case
	this.items = (Array.isArray(items)) ? items: [];
}

Case.prototype.ajouterItem = function(nom)
{
	this.items.push(new Item(nom));
	this.rechercherItem();
};

Case.prototype.rechercherItem = function()
{
	var itemPresent = false;
	
	for(var i = 0; i < this.items.length; i++)
	{
		if(this.items[i].nom == ousseRecherche.nom)
		{
			itemPresent = true;
		}
	}
	
	return itemPresent;
};

// Dessine la case dans le contexte graphique donné
Case.prototype.dessiner = function(context, marge)
{
	context.drawImage(this.texture, // l'image à utiliser comme texture du bloc
					 (marge+this.longueur)*this.x, // position x de la case
					 (marge+this.hauteur)*this.z,  // position z de la case
					 this.longueur, // longueur de la case
					 this.hauteur); // largeur de la case
};

/*
 Définition de l'objet Grille
 canvas : objet CanvasRenderingContext2D dans lequel dessiner la grille
 */
function Grille(canvas)
{
	this.cases = [];
	this.marge = 0;
	this.canvas = canvas;

    this.longueurCase = 20;
    this.hauteurCase = 20;

    this.x = 0;
    this.y = 0;
    this.maX = 0;
    this.maZ = 0;
    this.minX = 0;
    this.minZ = 0;

    this.prerendu = document.createElement("canvas");
    this.dbuffed = false;

    var ctx = this.canvas.getContext("2d");
    ctx.font = "48px serif";
    ctx.fillText("Chargement en cours...", this.canvas.width / 3, this.canvas.height / 2);
}

Grille.prototype.translate = function(x, y)
{
    var context = this.canvas.getContext("2d");
    this.x += x;
    this.y += y;
    context.translate(x, y)
};

// Dessine les cases de la grille
Grille.prototype.afficher = function(redessinerPrerendu)
{
	var context = this.canvas.getContext("2d");
    var redraw = (typeof (redessinerPrerendu) !== "undefined") ? redessinerPrerendu : false;
	
	context.save();
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.clearRect ( 0 , 0 , this.canvas.width, this.canvas.height );
	context.restore();

    // Au premier rendu ou sur demande, on dessine la banque entière dans un canvas
    // faisant office de texture unique
    if(this.dbuffed === false || redraw === true)
    {
        // On positionne l'origine du canvas courant sur la première case en haut à gauche
        this.translate(-(this.minX*(this.marge+this.longueurCase)),
            -(this.minZ*(this.marge+ this.hauteurCase)));

        // On définit la taille du canvas servant comme texture à la taille
        // que prend toutes les cases rendues
        this.prerendu.width = (this.maX - this.minX)* (this.longueurCase+ this.marge);
        this.prerendu.height = (this.maZ - this.minZ)* (this.hauteurCase+ this.marge);

        var dbuffContext = this.prerendu.getContext("2d");
        // On position son origine sur la première case en haut à gauche
        dbuffContext.translate(-(this.minX*(this.marge+this.longueurCase)),
            -(this.minZ*(this.marge+ this.hauteurCase)));

        // On dessine les cases dans le canvas-texture
        this.dessiner(dbuffContext);
        // On ne redessine plus le canvas-texture.
        this.dbuffed = true;
    }

    // On dessine le canvas-texture dans le canvas courant
    context.drawImage(this.prerendu, (this.minX*(this.marge+this.longueurCase)),
        (this.minZ*(this.marge+ this.hauteurCase)));

    ousseRecherche.afficherResultat(context, this.marge);
};

// Dessine les cases de la grille, dans le canvas défini dans la propriété "canvas"
// de l'objet
Grille.prototype.dessiner = function (context)
{
	for(var i = 0; i < this.cases.length; i++)
	{
		this.cases[i].dessiner(context, this.marge);
	}
};

/*
 Ajoute une case dans la grille
 x : position x
 z : position z
 nomImg : le nom de la texture à appliquer à la case
 items (optionnel) : la liste des items à lier à l'objet
 */
Grille.prototype.ajouter = function(x, z, nomImg, items)
{
	
	if (/^-?\d+$/.test(String(x)))
	{
		if (/^-?\d+$/.test(String(z)))
		{
			var nouvCase = new Case(x, z, nomImg, items, this.longueurCase, this.hauteurCase);
			this.cases.push(nouvCase);
		}
		else
		{
			console.log("La valeur Z spécifiée est invalide !");
		}
	}
	else
	{
		console.log("La valeur X spécifiée est invalide !");
	}
};

// Cherche la plus petite coordonnée de case de la grille
Grille.prototype.getMinMax = function()
{
    this.minX = this.cases[0].x;
    this.minZ = this.cases[0].z;
    this.maX = this.cases[0].x + this.longueurCase;
    this.maZ = this.cases[0].z + this.hauteurCase;
    for(var i = 1; i < this.cases.length; i++)
    {
        if(this.cases[i].x < this.minX)
        {
            this.minX = this.cases[i].x;
        }

        if(this.cases[i].z < this.minZ)
        {
            this.minZ = this.cases[i].z;
        }

        if(this.cases[i].x + this.longueurCase > this.maX)
        {
            this.maX = this.cases[i].x + this.longueurCase;
        }

        if(this.cases[i].z > this.maZ + this.hauteurCase)
        {
            this.maZ = this.cases[i].z + this.hauteurCase;
        }
    }

};

// Charge toutes les cases contenues dans du json parsé
Grille.prototype.charger = function(jsonParsed)
{
	jsonParsed.forEach(function(caseCourante)
	{
        this.ajouter(caseCourante.x, caseCourante.z, caseCourante.nomImg, caseCourante.items);
	}, this);

    this.getMinMax();
};

// Centre la vue du canvas sur une case
Grille.prototype.centrerSur = function (la_case)
{
    var posXCase = -(la_case.x * (this.longueurCase + this.marge));
    var translation_x = Math.round(-(this.x - posXCase) + canvas.width / 2);

    var posYCase = -(la_case.z * (this.hauteurCase + this.marge));
    var translation_y = Math.round(-(this.y - posYCase) + canvas.height / 2);
    this.translate(translation_x, translation_y);
};

// Lance une recherche des occurences de la recherche sur toutes les cases
Grille.prototype.rechercherItem = function()
{
	for(var i = 0; i < this.cases.length; i++)
	{
		if(this.cases[i].rechercherItem())
		{
			ousseRecherche.ajouter(this.cases[i]);
		}
	}

    if(ousseRecherche.resultat.length > 0)
    {
        this.centrerSur(ousseRecherche.resultat[0]);
    }
};



/*****************************
 * Fonctions événementielles *
 *****************************/

function ajouterCase(la_grille)
{
	var x = parseInt(document.getElementById("x").value);
	var z = parseInt(document.getElementById("z").value);
	la_grille.ajouter(x, z, "hardened_clay");
	la_grille.afficher();
}

function rechercher(grille)
{
    var nomRecherche = document.getElementById("inpRecherche").value;

    if(!ousseRecherche.definirRecherche(nomRecherche))
    {
        alert("Vous devez rentrer un nom d'item !");
    }

    grille.rechercherItem();
    grille.afficher();
}

function deplacerOriginePlan(event, la_grille)
{
    event.preventDefault();
	var deplacementX;
	var deplacementY;
	
	if($.isNumeric(posX))
	{

		deplacementX = event.clientX - posX;
		deplacementY = event.clientY - posY;

		if(boutDroitEnfonce == true)
		{
			la_grille.translate(deplacementX, deplacementY);
			la_grille.afficher();
		}
	}
	
	posX = event.clientX;
	posY = event.clientY;
}

function registerMouseEvents(la_grille)
{
    $( "#"+ grille.canvas.id).on( "mousemove", function( event ) {
        deplacerOriginePlan(event, la_grille);
    });
    $( "#"+ grille.canvas.id).on( "mousedown", function( event )
    {
        if(event.which === 1)
        {
            boutDroitEnfonce = true;
        }
    });
    $( "#"+ grille.canvas.id).on( "mouseup", function( event ) {
        if(event.which === 1)
        {
            boutDroitEnfonce = false;
        }
    });
}