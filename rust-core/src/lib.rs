mod utils;

use std::io::Write;

use wasm_bindgen::prelude::*;

use crate::utils::set_panic_hook;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ___SLIGHT_STREAM_ZIP___GLOBAL_MANAGER_)]
    fn next_chunk(zip_id: i32, blob_id: i32) -> Option<Box<[u8]>>;
}

#[derive(Debug)]
enum Entry {
    File { path: String, id: i32 },
    Folder { path: String },
}

#[wasm_bindgen]
pub struct InternalStreamZip {
    zip_id: i32,
    ops: Vec<Entry>,
    options: zip::write::FileOptions,
    zip: zip::ZipWriter<std::io::Cursor<Vec<u8>>>,
}

#[wasm_bindgen]
impl InternalStreamZip {
    #[wasm_bindgen(constructor)]
    pub fn new(id: i32, compression_method: i32, compression_level: Option<i32>) -> Self {
        set_panic_hook();

        let compression_method = match compression_method {
            0 => zip::CompressionMethod::STORE,
            1 => zip::CompressionMethod::DEFLATE,
            _ => panic!("not support method"),
        };
        let zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
        Self {
            zip_id: id,
            ops: Default::default(),
            options: zip::write::FileOptions::default()
                .compression_method(compression_method)
                .compression_level(compression_level),
            zip,
        }
    }

    pub fn add_folder(&mut self, path: &str) {
        self.ops.push(Entry::Folder {
            path: path.to_string(),
        })
    }

    pub fn add_file(&mut self, path: &str, blob_id: i32) {
        self.ops.push(Entry::File {
            path: path.to_string(),
            id: blob_id,
        })
    }

    pub fn flush(&mut self) {
        for entry in self.ops.iter() {
            match entry {
                Entry::Folder { path } => {
                    self.zip.add_directory(path, self.options).unwrap();
                }
                Entry::File { path, id } => {
                    self.zip.start_file(path, self.options).unwrap();
                    while let Some(chunk) = next_chunk(self.zip_id, *id) {
                        self.zip.write_all(&chunk).unwrap();
                    }
                }
            }
        }
        self.ops.clear();
    }

    pub fn finish(&mut self) -> Box<[u8]> {
        self.flush();
        let res = self.zip.finish().unwrap();
        res.into_inner().into_boxed_slice()
    }
}
