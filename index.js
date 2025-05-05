const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const db = require(process.cwd() + "/config/db");
let con = null;
const multer = require("multer");
let storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./public/uploads");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

const generateUniqueNumber = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  require("express-session")({
    secret: "express-session",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static("public"));

//=====================
// ROUTES
//=====================

app.get("/editCustomer", function (req, res) {
  let customer_id = req.session.customer_id;
  if (!customer_id) {
    return res.render("index", { success: 0 });
  }
  if (con == null) con = db.openCon(con);
  con.query(
    "select * from customer where id = ?",
    customer_id,
    function (err, result) {
      if (err) {
        return res.render("editCustomer", { success: 0, result });
      }
      return res.render("editCustomer", { success: 2, result });
    }
  );
});

app.post("/editCustomer", function (req, res) {
  let customer_id = req.session.customer_id;
  let fname = req.body.fname;
  let lname = req.body.lname;
  let phone = req.body.phone;
  if (!customer_id) {
    return res.render("index", { success: 0 });
  }
  if (con == null) con = db.openCon(con);
  con.query(
    "update customer set fname = ?, lname = ?, phone = ? where id = ?",
    [fname, lname, phone, customer_id],
    function (err, result) {
      if (err) {
        return res.render("index", { success: 0 });
      }
      con.query(
        "select * from customer where id = ?",
        customer_id,
        function (err, result) {
          if (err) {
            return res.render("index", { success: 0 });
          }
          return res.render("editCustomer", { success: 1, result });
        }
      );
    }
  );
});

app.get("/submitCustomer", function (req, res) {
  return res.render("submitCustomer", { success: -1 });
});

app.get("/qr", function (req, res) {
  return res.render("qr", { success: -1 });
});

app.post("/submitCustomer", function (req, res) {
  let data = {
    fname: req.body.fname,
    lname: req.body.lname,
    email: req.body.email,
    phone: req.body.phone,
    passw: req.body.password1,
  };
  if (con == null) con = db.openCon(con);
  con.query(
    "select * from customer where email = ?",
    req.body.email,
    function (err, result) {
      if (err) {
        console.log("submitCustomer.err1: ", err);
        return res.render("submitCustomer", { success: 0 });
      }
      if (result.length > 0) {
        return res.render("submitCustomer", { success: 2 });
      } else {
        con.query("insert into customer set ?", data, function (err, result) {
          if (err) {
            console.log("submitCustomer.err2: ", err);
            return res.render("submitCustomer", { success: 0 });
          }
          return res.render("submitCustomer", { success: 1 });
        });
      }
    }
  );
});

app.get("/loginAdmin", function (req, res) {
  return res.render("loginAdmin", { success: -1 });
});

app.post("/loginAdmin", function (req, res) {
  let email = req.body.email;
  let passw = req.body.password1;
  if (email == "admin@mail.com" && passw == "admin") {
    req.session.utype = "admin";
    return res.render("adminAccount", { success: 1 });
  } else {
    return res.render("loginAdmin", { success: 0 });
  }
});

app.get("/loginCustomer", function (req, res) {
  return res.render("loginCustomer", { success: -1 });
});

app.post("/loginCustomer", function (req, res) {
  let email = req.body.email;
  let passw = req.body.password1;
  if (con == null) con = db.openCon(con);
  con.query(
    "select * from customer where email = ? and passw = ?",
    [email, passw],
    function (err, result) {
      if (err) {
        return res.render("loginCustomer", { success: 0 });
      } else if (result.length == 0) {
        return res.render("loginCustomer", { success: 3 });
      } else {
        req.session.utype = "customer";
        req.session.customer_id = result[0].id;
        return res.render("customerAccount", { success: 1 });
      }
    }
  );
});

app.get("/addEvent", function (req, res) {
  return res.render("addEvent", { success: -1 });
});

app.post(
  "/addEvent",
  upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },
  ]),
  function (req, res) {
    let data = {
      event_name: req.body.event_name,
      desc: req.body.description,
      state: req.body.state,
      city: req.body.city,
      address: req.body.address,
      max_persons: req.body.max_persons_allowed,
      remaining_persons: req.body.max_persons_allowed,
      ticket_price: req.body.ticket_price,
      photo: req.files.photo[0].filename,
      date1: req.body.date1,
      time1: req.body.time1,
    };
    if (con == null) con = db.openCon(con);
    con.query("insert into events set ?", data, function (err, result) {
      if (err) {
        return res.render("adminAccount", { success: 0 });
      }
      return res.render("addEvent", { success: 1 });
    });
  }
);

app.get("/removeEvent", function (req, res) {
  let id = req.query.id;
  if (con == null) con = db.openCon(con);
  con.query("delete from events where id = ?", id, function (err, result) {
    if (err) {
      return res.render("adminAccount", { success: -1 });
    }
    con.query("select * from events order by id desc", function (err, result) {
      if (err) {
        return res.render("adminAccount", { success: -1 });
      }
      return res.render("listEvents", { success: 1, result });
    });
  });
});

app.get("/listEvents", function (req, res) {
  if (con == null) con = db.openCon(con);
  con.query("select * from events order by id desc", function (err, result) {
    if (err) {
      return res.render("adminAccount", { success: -1 });
    }
    return res.render("listEvents", { success: 2, result });
  });
});

app.get("/customerList", function (req, res) {
  if (con == null) con = db.openCon(con);
  con.query("select * from customer", function (err, result) {
    if (err) {
      return res.render("adminAccount", { success: -1 });
    }
    return res.render("customerList", { success: 2, result });
  });
});

app.get("/listPage", function (req, res) {
  let utype = req.session.utype;
  if (utype == "customer") {
    return res.render("customerAccount", { success: -1 });
  } else if (utype == "admin") {
    return res.render("adminAccount", { success: -1 });
  }
  return res.render("index", { success: -1 });
});

app.post("/listPage", function (req, res) {
  const search = req.body.search;
  const searchTerm = `%${search}%`;
  let utype = req.session.utype;
  if (con == null) con = db.openCon(con);
  con.query(
    "select * from events where event_name like ? or state like ? or city like ?",
    [searchTerm, searchTerm, searchTerm],
    function (err, result) {
      if (err) {
        return res.render("listPage", { success: 0, result, utype });
      }
      return res.render("listPage", { success: 2, result, utype });
    }
  );
});

app.get("/listAll", function (req, res) {
  let utype = req.session.utype;
  if (con == null) con = db.openCon(con);
  con.query("select * from events", function (err, result) {
    if (err) {
      return res.render("listPage", { success: 0, result, utype });
    }
    return res.render("listPage", { success: 2, result, utype });
  });
});

app.get("/detailPage", function (req, res) {
  let id = req.query.id;
  let customer_id = req.session.customer_id;
  if (con == null) con = db.openCon(con);
  if (!customer_id) {
    return res.render("index", { success: 10 });
  }
  con.query(
    "select * from customer where id = ?",
    customer_id,
    function (err, result21) {
      if (err) {
        return res.render("customerAccount", { success: 0 });
      }
      con.query(
        "select * from events where id = ?",
        id,
        function (err, result) {
          if (err) {
            return res.render("customerAccount", { success: 0 });
          }
          return res.render("detailPage", {
            result,
            customer_id,
            customer: result21,
          });
        }
      );
    }
  );
});

app.post("/thankyou", function (req, res) {
  let date = new Date();
  let datetime = `${
    date.getMonth() + 1
  }/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
  let data = {
    fname: req.body.fname,
    lname: req.body.lname,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    city: req.body.city,
    postal_code: req.body.postal_code,
    event_id: req.body.event_id,
    no_of_persons: req.body.no_of_persons,
    customer_id: req.session.customer_id,
    datetime: datetime,
    price: req.body.price,
    unique_id: generateUniqueNumber(),
    status: 1,
  };

  if (con == null) con = db.openCon(con);
  con.beginTransaction((err) => {
    if (err) {
      return res.render("customerAccount", { success: 0 });
    }
    const insertOrderQuery = "INSERT INTO orders SET ?";
    con.query(insertOrderQuery, data, (err, result) => {
      if (err) {
        return con.rollback(() => {
          res.render("customerAccount", { success: 0 });
        });
      }
      const updateEventQuery =
        "UPDATE events SET remaining_persons = remaining_persons - ? WHERE id = ?";
      con.query(
        updateEventQuery,
        [req.body.no_of_persons, data.event_id],
        (err, result) => {
          if (err) {
            return con.rollback(() => {
              res.render("customerAccount", { success: 0 });
            });
          }
          // Commit the transaction if both queries succeed
          con.commit((err) => {
            if (err) {
              return con.rollback(() => {
                res.render("customerAccount", { success: 0 });
              });
            }
            res.render("thankyou", { success: 2 });
          });
        }
      );
    });
  });
});

app.get("/customerOrders", async function (req, res) {
  let customer_id = req.session.customer_id;
  if (con == null) con = await db.openCon(con);
  con.query(
    "SELECT events.event_name, events.address, events.date1, events.time1, orders.price, orders.datetime, orders.no_of_persons, orders.unique_id FROM orders LEFT JOIN EVENTS ON events.id = orders.event_id where orders.customer_id = ?",
    customer_id,
    function (err, result) {
      if (err) {
        return res.render("customerAccount", { success: 0 });
      }
      return res.render("customerOrders", { success: 2, result });
    }
  );
});

app.get("/adminOrders", async function (req, res) {
  if (con == null) con = db.openCon(con);
  con.query(
    "SELECT orders.id AS order_id, orders.fname, orders.lname, orders.email, orders.phone, orders.address AS order_address,orders.city, events.event_name, events.address AS event_address, orders.price, orders.datetime, orders.status, orders.unique_id FROM orders LEFT JOIN EVENTS ON events.id = orders.event_id",
    function (err, result) {
      if (err) {
        return res.render("adminAccount", { success: 0 });
      }
      return res.render("adminOrders", { success: 2, result });
    }
  );
});

app.get("/", function (req, res) {
  let utype = req.session.utype;
  if (utype == "admin") {
    return res.render("adminAccount", { success: -1 });
  } else if (utype == "customer") {
    return res.render("customerAccount", { success: -1 });
  } else {
    return res.render("index", { success: -1 });
  }
});

app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

let port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server Has Started!");
});
