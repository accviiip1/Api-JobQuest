import { db } from "../config/connect.js";
import "express-async-errors";

export const getAll = (req, res) => {
  const q =
    "SELECT id as fId, name as name , name as value, name as label, typeField FROM fields";

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi database", error: err });
    }
    return res.json(data || []);
  });
};

export const getWithType = (req, res) => {
  const q = `SELECT f.id, name as name , name as value, name as label, typeField, count(j.nameJob) as countJobs 
     FROM fields as f LEFT JOIN jobs as j on f.id = j.idField and j.deletedAt is null group by f.id`;

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi database", error: err });
    }
    return res.json(data || []);
  });
};

// Admin CRUD for fields
export const getAllAdmin = (req, res) => {
  const q = "SELECT id, name, typeField FROM fields";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data || []);
  });
};

export const insertFieldByAdmin = async (req, res) => {
  const { name, typeField } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });
  if (name?.length > 255 || (typeField?.length || 0) > 255)
    return res.status(409).json({ message: "Các trường vượt quá độ dài cho phép!" });
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.query("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM fields");
    const nextId = rows?.[0]?.nextId || 1;
    await promiseDb.query("INSERT INTO fields (id, name, typeField) VALUES (?, ?, ?)", [nextId, name, typeField || null]);
    return res.status(200).json({ message: "Field added", id: nextId });
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const updateFieldByAdmin = (req, res) => {
  let { id, name, typeField } = req.body;
  if (id === undefined || id === null || id === "") return res.status(400).json({ message: "Missing id" });
  id = Number(id);
  if (!name) return res.status(400).json({ message: "Name is required" });
  if (name?.length > 255 || (typeField?.length || 0) > 255)
    return res.status(409).json({ message: "Các trường vượt quá độ dài cho phép!" });
  const q = "UPDATE fields SET name = ?, typeField = ? WHERE id = ?";
  db.query(q, [name, typeField || null, id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: "Updated" });
    return res.status(404).json({ message: "Field not found" });
  });
};

export const deleteFieldByAdmin = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing id" });
  const q = "DELETE FROM fields WHERE id = ?";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: "Deleted" });
    return res.status(404).json({ message: "Field not found" });
  });
};
