use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub fn count() -> usize {
    get_data().data.data.len()
}

#[wasm_bindgen]
pub fn initialize(s: String) {
    unsafe { DATA = Some(Data::new(s)) }
}

#[wasm_bindgen]
pub fn search(query: String, page: usize, items: usize) -> JsValue {
    let query: Search = serde_json::from_str(&query).unwrap();
    let v = get_data().data.data.iter().filter(|v| search_data(&query, v)).skip((page - 1) * items).take(items).cloned().collect::<Vec<_>>();
    serde_wasm_bindgen::to_value(&v).unwrap()
}

#[wasm_bindgen]
pub fn tags(page: usize, items: usize) -> JsValue {
    let v = get_data().tags.iter().skip((page - 1) * items).take(items).collect::<Vec<_>>();
    serde_wasm_bindgen::to_value(&v).unwrap()
}

#[wasm_bindgen]
pub fn tag_search(query: String, page: usize, items: usize) -> JsValue {
    let v = get_data().tags.iter().filter(|v| v.contains(&query)).skip((page - 1) * items).take(items).collect::<Vec<_>>();
    serde_wasm_bindgen::to_value(&v).unwrap()
}

#[wasm_bindgen]
pub fn search_count(query: String) -> usize {
    let query: Search = serde_json::from_str(&query).unwrap();
    get_data().data.data.iter().filter(|v| search_data(&query, v)).count()
}

fn inverse(b1: bool, b2: bool) -> bool {
    if b2 {
        !b1
    } else {
        b1
    }
}

fn search_data(query: &Search, data: &&Anime) -> bool {
    let sub = |or: bool, items: &Vec<SearchItem>, func: Box<dyn Fn(&String) -> bool>| {
        let mut overall: bool = false;
        for item in items {
            if !inverse(func(&item.value), item.not) {
                //and => any
                if !or {
                    return false;
                }
            } else if or {
                // or => any
                overall = true;
                continue;
            }
        }
        //or => none
        if or && !overall {
            return false;
        }
        true
    };
    //tag search
    let q1 = sub(query.tag.or, &query.tag.items, Box::new(|v| data.tags.contains(v)));
    //type search
    let q2 = sub(query.typ.or, &query.typ.items, Box::new(|v| &data.r#type == v));
    //status search
    let q3 = sub(query.status.or, &query.status.items, Box::new(|v| &data.status == v));
    if !q1 || !q2 || !q3 {
        return false;
    }
    //episode search
    if !match query.episodes.operation {
        Operation::Bigger => data.episodes > query.episodes.number,
        Operation::Smaller => data.episodes < query.episodes.number,
        Operation::BiggerEq => data.episodes >= query.episodes.number,
        Operation::SmallerEq => data.episodes <= query.episodes.number,
        Operation::Eq => data.episodes == query.episodes.number,
    } {
        return false;
    }
    let title = query.title.to_lowercase();
    //title search
    if !query.title.is_empty() && !data.synonyms.iter().any(|v| v.contains(&title)) && !data.title.to_lowercase().contains(&title) {
        return false;
    }
    true
}

struct Data {
    data: Root,
    tags: Vec<String>,
}

impl Data {
    fn new(s: String) -> Data {
        let root = Self::init_root(&s);
        let tags = Self::init_tags(&root);
        Data {
            data: root,
            tags,
        }
    }

    fn init_root(str: &str) -> Root {
        let v: Root = serde_json::from_str(str).unwrap();
        let replace_temp: HashMap<String, Vec<String>> = serde_json::from_str(include_str!("merge_tags.json")).unwrap();

        let mut replace: HashMap<String, String> = HashMap::new();
        for (new, old) in replace_temp {
            for item in old {
                replace.insert(item.to_string(), new.to_string());
            }
        }
        let exclude: HashSet<String> = serde_json::from_str::<Vec<String>>(include_str!("exclude.json")).unwrap().into_iter().collect();
        let mut v = v.data.into_iter().map(|mut v| {
            v.synonyms = v.synonyms.into_iter().map(|v|v.to_lowercase()).collect();
            v.tags = v.tags.into_iter().map(|v| match replace.get(&v) {
                Some(v) => v.clone(),
                None => v
            }).collect::<Vec<_>>();
            v
        }).filter(|v| {
            !v.sources.iter().any(|v| exclude.contains(v))
        }).collect::<Vec<_>>();
        v.sort_by(|a, b| b.anime_season.year.unwrap_or(0).partial_cmp(&a.anime_season.year.unwrap_or(0)).unwrap());
        Root { data: v }
    }

    fn init_tags(root: &Root) -> Vec<String> {
        let mut v = root.data.iter().flat_map(|v| v.tags.clone()).collect::<HashSet<_>>().into_iter().collect::<Vec<_>>();
        v.sort();
        v
    }
}


static mut DATA: Option<Data> = None;

fn get_data() -> &'static Data {
    unsafe {
        DATA.as_ref().unwrap()
    }
}

#[cfg(test)]
mod tests {
    use std::fs::File;
    use std::io::Write;

    use crate::get_data;

    #[test]
    fn all_tags() {
        File::create("alltags").unwrap().write_all(get_data().tags.join("\n").as_bytes()).unwrap();
    }
}

#[derive(Serialize, Deserialize, Clone)]
struct AnimeSeason {
    pub season: String,
    pub year: Option<i64>,

}

#[derive(Serialize, Deserialize, Clone)]
struct Anime {
    pub sources: Vec<String>,
    pub title: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub episodes: i64,
    pub status: String,
    #[serde(rename = "animeSeason")]
    pub anime_season: AnimeSeason,
    pub picture: String,
    pub thumbnail: String,
    pub synonyms: Vec<String>,
    pub relations: Vec<String>,
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct Root {
    pub data: Vec<Anime>,
}

#[derive(Serialize, Deserialize)]
struct Search {
    typ: SearchArr,
    tag: SearchArr,
    status: SearchArr,
    title: String,
    episodes: SearchEpisode,
    //from-to
}

#[derive(Serialize, Deserialize)]
struct SearchArr {
    items: Vec<SearchItem>,
    or: bool,
}

#[derive(Serialize, Deserialize)]
enum Operation {
    Bigger,
    Smaller,
    BiggerEq,
    SmallerEq,
    Eq,
}

#[derive(Serialize, Deserialize)]
struct SearchEpisode {
    number: i64,
    operation: Operation,
}

#[derive(Serialize, Deserialize)]
struct SearchItem {
    value: String,
    not: bool,
}