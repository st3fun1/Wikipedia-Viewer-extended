<?php
error_reporting(0);
/* TO DO: case insensitive checking for listName*/
require('config.php');
require('functions.php');
$address = basename($_SERVER['PHP_SELF']) . "?action=listMore&limit=5";
//&& array_search($_GET['listName'],$professions) > -1
if(isset($_GET['listName'])){
    $list = null;
    $wikiFormat = listNameToWikiFormat($_GET['listName']);
    
    if(isset($_GET['action']) && $_GET['action'] == 'checkValidity'){
        
        $msgCode = 0;
        $msgTxt = "This list can't be processed";
        //opensearch for case insensitivity
        $count = wikiDataToArr('https://en.wikipedia.org/w/api.php?action=parse&page='.$wikiFormat.'&format=json');
        if($count){
            $msgCode = 1000;
            $msgTxt = "This list contains ". $count ." items.";
        }
        header('Access-Control-Allow-Origin: *');
        header('Content-type:application/json;charset=utf-8');
        echo json_encode(["messageCode" => $msgCode, "messageText" => $msgTxt]);
        exit();
    }
    //add hidden post field for checking
    if(findOtherFormats($wikiFormat)){

        $ext = findOtherFormats($wikiFormat);
        if($ext == 'xml'){
            $xmlObj = simplexml_load_string(file_get_contents($wikiFormat . "." . $ext));
            $list = object_to_array($xmlObj)['item']['item'];
        } else if ($ext == 'json'){
            $list = json_decode(file_get_contents("files/$ext/$wikiFormat.$ext"),true);
        }
    } else {
        $people = wikiDataToArr('https://en.wikipedia.org/w/api.php?action=parse&page='.$wikiFormat.'&format=json');
        $arrOfPersons = getDescription($people);
        $actionStatus = makeJSONFile($wikiFormat, createReadyToUseArr($arrOfPersons));

        if($actionStatus) {
            $file = file_get_contents("files/json/{$wikiFormat}.json");
            $list = json_decode($file,true);
        }
    }

    //add cache for content via wiki api
    if(isset($_GET['page']) && isset($_GET['limit'])){
        $page = $_GET['page'];
        $limit = $_GET['limit'];
        
        if($page > 1){
            $response = ["list" => array_slice($list,$page * $limit-1,$limit)];
        } else {
            $response = ["list" => array_slice($list,$page-1,$limit-1)];
        }
    } else {
        $response = [ "list" => array_slice($list,0,20), "listLength" => count($list)];
    }
//    header('Access-Control-Allow-Origin: *');
    header('Content-type:application/json;charset=utf-8');
    echo json_encode($response);
} else {
//    header('Access-Control-Allow-Origin: *');
    header('Content-type:application/json;charset=utf-8');
    echo json_encode(["message" => "This list can't be processed!"]);
}
?>
