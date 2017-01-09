<?php    
error_reporting(0);

function arrayToXML($obj,$arr){
    foreach($arr as $key=>$val){

        if(is_numeric($key)){
            $key = 'item';
        }
        
        if(is_array($val)){
            $node = $obj->addChild($key);
            arrayToXML($node,$val);
        } else {
            $obj->addChild($key,htmlspecialchars($val));
        }
    }
}


function getMainListData($url){
    $curl = curl_init();
    curl_setopt_array($curl,[
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => 1
    ]);
    $result = curl_exec($curl);
    curl_close($curl);
    if(property_exists(json_decode($result),'error')){
        return false; 
    }
    return $result;
}

function debug($arr,$action){
    echo "<pre>";
    if($action == 1) print_r($arr);
    else var_dump($arr);
    echo "</pre>";
}

function makeXMLFile($root,$arrOfData,$fileName){
    $xml = new SimpleXMLElement($root);
    arrayToXML($xml,$arrOfData);
    $xml->asXML("files/xml/".$fileName .'.xml');
    return $xml;
}


function makeJSONFile($fileName,$arrOfData){
    $formatedArr = array_values((array)$arrOfData)[0];
    $fp = fopen("files/json/$fileName.json","w");
    $actionStatus = fwrite($fp,json_encode($formatedArr,JSON_PRETTY_PRINT));
    fclose($fp);
    return $actionStatus;
}


function getListOfPeople($peopleList){
    $people = [];
    foreach($peopleList as $person){

        if($person->getAttribute('title') !== ''){

            if(!preg_match('(List(s)?\_of|Portal\:|Category\:|Template|Glossary|Notation|Outline)',$person->getAttribute('href'))){
                $name = str_replace(' ','_',$person->getAttribute('title'));
                $people[] =  ["title" => $name];
            }
        }
    }
    if(count($people) < 1){
        $msgCode = 0;
        $msgTxt = "This list can't be processed";
        header('Content-type:application/json;charset=utf-8');
        echo json_encode(["messageCode" => $msgCode, "messageText" => $msgTxt]);
        exit();
    }
    return $people;
}

function getDescription($arr){
    define('MAX_EXTRACTIONS',20);
    $persons1 = [];
    $names = '';
    $m = 0; //offset
    $w = 20; //number of max persons you can query wiki
    
    while($m <= count($arr)){
        
        if(count($arr) - $m <= 20) $w = count($arr) - $m;
        for($i = $m; $i < $m + $w; $i++){
            
            if($i == $m + $w - 1){
                $names .= $arr["$i"]['title'];
            } else {
                $names .= $arr["$i"]['title']."|";
            }
        }
        $result = getMainListData("https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&exlimit=20&explaintext=&titles={$names}");
        $arrOfResults = json_decode($result,true);
        $m += MAX_EXTRACTIONS;
        $persons1[] = $arrOfResults;
        $names = '';
        
    }
    return $persons1;
}

function findOtherFormats($fileName){
    $list = glob("files/{json,xml}/$fileName.{json,xml}",GLOB_BRACE);
    if(count($list) > 0){
        $ext = pathinfo($list[0], PATHINFO_EXTENSION);
        return $ext;
    }
    return false;
}

function wikiDataToArr($url){
    $result = getMainListData($url);
    
    if(!$result){
        return false;
    }
    $decodedString = json_decode($result,true);
    $pageMarkup = $decodedString['parse']['text']['*'];
    if(!$pageMarkup){
        return false;
    }
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML(mb_convert_encoding($pageMarkup, 'HTML-ENTITIES', "UTF-8"));
    $xpath = new DOMXPath($doc);
    /*
    //h2/span[@id!='See_also' or @id!='External_links']/../following-sibling::*[1][self::div]/ul/li/a[1]
    //h2/span[@id!='See_also' or @id!='External_links']/../following-sibling::*[1][self::ul]/li[text()]
    //h2/span[@id!='See_also' or @id!='External_links']/../following-sibling::*[1][self::ul]/li/a[1]
    ////h2/span[@id!='See_also']/../following-sibling::*[1][self::ul]/li/a[1]|
    //h2/span[@id!='See_also']/../following-sibling::*[1][self::div]/ul/li/a[1]|
    //h2/span[@id!='See_also' or @id!='External_links']/../following-sibling::*[1][self::ul]/li[text()]|
    //h2/span[@id!='See_also' or @id!='External_links']/../following-sibling::*[1][self::ul]/li/a[1]
    */
    $elements = $xpath->query("
    //h2/span[@id!='See_also']/../following-sibling::*[1][self::ul]/li/a[1]|
    //h2/span[@id!='See_also']/../following-sibling::*[1][self::div]/ul/li/a[1]|
    //h2/span[@id!='See_also' or @id!='External_links']/../following-sibling::*[1][self::ul]/li[text()]|
    //h2/span[@id!='See_also' or @id!='External_links']/../following-sibling::*[1][self::ul]/li/a[1]
    ");
    if(!count($elements)){
        return false;
    }
    return getListOfPeople($elements);
}


function createReadyToUseArr($people){
    $arrOfData = [[]];
    
    foreach($people as $person){
        if (is_array($person['query']['pages']) || is_object($person['query']['pages'])){
            $keys = array_keys($person['query']['pages']);
            foreach($keys as $key){
                array_push($arrOfData[0],[
                'name' => $person['query']['pages'][$key]['title'],
                'description' => $person['query']['pages'][$key]['extract']
                ]);
            }
        }
    }
    return $arrOfData;
}

function object_to_array($obj){
    
    $data = array();
    
    if(!is_object($obj)){
        return $obj;
    }
    
    foreach(get_object_vars($obj) as $k=>$v){
        if(is_array($v)){
            foreach($v as $k2=>$v2){
                $data[$k][$k2] = object_to_array($v2);
            }
        } else {
            $data[$k] = object_to_array($v);
        }
    }
    return $data;
}


function listNameToWikiFormat($listName){
    return implode('_',explode(' ',rawurldecode($listName)));
}
