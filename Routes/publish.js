const express = require("express");
const router = express.Router();

const cloudinary = require("cloudinary").v2;

// MODELS IMPORT
const Offer = require("../Models/Offer");
const User = require("../Models/User");

// MIDDLEWARE IMPORT
const isAuthenticated = require("../Middleware/isAuthenticated");

// PUBLISHING AN OFFER
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      size,
      brand,
      condition,
      city,
      color,
    } = req.fields;

    const newOffer = new Offer({
      name: title,
      description: description,
      price: price,
      details: [
        {
          brand: brand,
        },
        {
          size: size,
        },
        {
          condition: condition,
        },
        {
          color: color,
        },
        {
          location: city,
        },
      ],

      owner: req.user,
    });

    const result = await cloudinary.uploader.upload(req.files.picture.path, {
      folder: `/Vinted/offers/${newOffer._id}`,
      allowed_formats: ["png, jpg"],
    });

    newOffer.image = result;
    await newOffer.save();
    res.status(200).json(newOffer);
  } catch (error) {
    res.status(400).json({ error: "hello" });
  }
});

router.get("/offers", async (req, res) => {
  try {
    let filters = {};

    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
    }

    if (req.query.priceMin) {
      filters.product_price = {
        $gte: Number(req.query.priceMin),
      };
    }

    if (req.query.priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = Number(req.query.priceMax);
      } else {
        filters.product_price = {
          $lte: Number(req.query.priceMax),
        };
      }
    }

    let sort = {};

    if (req.query.sort === "price-desc") {
      sort.product_price = -1;
    }
    if (req.query.sort === "price-asc") {
      sort.product_price = 1;
    }

    let page;
    if (req.query.page < 1) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }

    let limit = Number(req.query.limit);

    const count = await Offer.countDocuments(filters);

    const offers = await Offer.find(filters)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("name price");
    res.status(200).json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE AN OFFER
router.put("/offer/update/:id", isAuthenticated, async (req, res) => {
  const id = req.params.id.replace(":", "");

  const offerToModify = await Offer.findById(id);

  try {
    if (req.fields.title) {
      offerToModify.name = req.fields.title;
    }
    if (req.fields.description) {
      offerToModify.description = req.fields.description;
    }
    if (req.fields.price) {
      offerToModify.price = req.fields.price;
    }

    const details = offerToModify.details;
    for (i = 0; i < details.length; i++) {
      if (details[i].brand) {
        if (req.fields.brand) {
          details[i].brand = req.fields.brand;
        }
      }
      if (details[i].size) {
        if (req.fields.size) {
          details[i].size = req.fields.size;
        }
      }
      if (details[i].condition) {
        if (req.fields.condition) {
          details[i].condition = req.fields.condition;
        }
      }
      if (details[i].color) {
        if (req.fields.color) {
          details[i].color = req.fields.color;
        }
      }
      if (details[i].location) {
        if (req.fields.location) {
          details[i].location = req.fields.location;
        }
      }
    }

    // Notifie Mongoose que l'on a modifié le tableau product_details
    offerToModify.markModified("details");

    if (req.files.picture) {
      const result = await cloudinary.uploader.upload(req.files.picture.path, {
        public_id: `Vinted/offers/${offerToModify._id}/preview`,
      });
      offerToModify.image = result;
    }

    await offerToModify.save();

    res.status(200).json(offerToModify);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

// DELETE AN OFFER
router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id.replace(":", "");
    let offerToDelete = await Offer.findById(id);
    if (offerToDelete) {
      //Je supprime ce qui il y a dans le dossier

      await cloudinary.api.delete_resources_by_prefix(`Vinted/offers/${id}`);
      //Une fois le dossier vide, je peux le supprimer !
      await cloudinary.api.delete_folder(`Vinted/offers/${id}`);

      await offerToDelete.delete();

      res.status(200).json("Offer deleted succesfully !");
    } else {
      res.status(400).json({
        message: "Bad request",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: "something when wrong" });
  }
});

module.exports = router;