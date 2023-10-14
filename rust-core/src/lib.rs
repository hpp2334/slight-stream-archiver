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
}

#[wasm_bindgen]
impl InternalStreamZip {
    #[wasm_bindgen(constructor)]
    pub fn new(id: i32) -> Self {
        set_panic_hook();
        Self {
            zip_id: id,
            ops: Default::default(),
            options: zip::write::FileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated)
                .compression_level(Some(9)),
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

    pub fn finish(self) -> Box<[u8]> {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));

        for entry in self.ops {
            match entry {
                Entry::Folder { path } => {
                    zip.add_directory(path, self.options).unwrap();
                }
                Entry::File { path, id } => {
                    zip.start_file(path, self.options).unwrap();
                    while let Some(chunk) = next_chunk(self.zip_id, id) {
                        zip.write(&chunk).unwrap();
                    }
                }
            }
        }
        let res = zip.finish().unwrap();
        res.into_inner().into_boxed_slice()
    }
}
