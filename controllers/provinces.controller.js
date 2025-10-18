import { db } from "../config/connect.js";
import "express-async-errors";

export const getAll = (req, res) => {
  const q =
    "SELECT id as pId ,name as name , name as value, name as label, nameWithType FROM provinces";

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi database", error: err });
    }
    return res.json(data || []);
  });
};

export const getWithType = (req, res) => {
  const q = `SELECT p.id ,name as name , name as value, name as label, nameWithType, count(j.nameJob) as countJobs 
    FROM provinces as p LEFT JOIN jobs as j on p.id = j.idProvince group by p.id`;

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi database", error: err });
    }
    return res.json(data || []);
  });
};

// Admin CRUD for provinces
export const getAllAdmin = (req, res) => {
  const q = "SELECT id, name, nameWithType FROM provinces";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data || []);
  });
};

export const insertProvinceByAdmin = async (req, res) => {
  const { name, nameWithType } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });
  if (name?.length > 255 || (nameWithType?.length || 0) > 255)
    return res.status(409).json({ message: "Các trường vượt quá độ dài cho phép!" });

  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.query("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM provinces");
    const nextId = rows?.[0]?.nextId || 1;
    await promiseDb.query("INSERT INTO provinces (id, name, nameWithType) VALUES (?, ?, ?)", [nextId, name, nameWithType || null]);
    return res.status(200).json({ message: "Province added", id: nextId });
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const updateProvinceByAdmin = (req, res) => {
  let { id, name, nameWithType } = req.body;
  if (id === undefined || id === null || id === "") return res.status(400).json({ message: "Missing id" });
  id = Number(id);
  if (!name) return res.status(400).json({ message: "Name is required" });
  if (name?.length > 255 || (nameWithType?.length || 0) > 255)
    return res.status(409).json({ message: "Các trường vượt quá độ dài cho phép!" });
  const q = "UPDATE provinces SET name = ?, nameWithType = ? WHERE id = ?";
  db.query(q, [name, nameWithType || null, id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: "Updated" });
    return res.status(404).json({ message: "Province not found" });
  });
};

export const deleteProvinceByAdmin = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing id" });
  const q = "DELETE FROM provinces WHERE id = ?";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: "Deleted" });
    return res.status(404).json({ message: "Province not found" });
  });
};
