<?php 
error_reporting(0);
require('config.php');
require('functions.php');
// checkIfFileExists($_GET['list']);
//&& array_search($_GET['list'],$professions) > -1 && isset($_GET['format'])
if(isset($_GET['list'])){
    $format = $_GET['format'];
    $list = $_GET['list'];
    $wikiFormat = listNameToWikiFormat($_GET['list']);
    
    if(file_exists("files/$format/$wikiFormat".".".$format) == 1){
        $response = [
        "message" => "File already exists!",
        "url" => "files/$format/". $wikiFormat . "." . $format,
        "fileType" => $_GET['format'],
        "fileName" => $list
        ];
    } else if(findOtherFormats($wikiFormat)){
        $fileFormat = findOtherFormats($wikiFormat);
        
        if($fileFormat == 'json'){
            $arrOfData = json_decode(file_get_contents("files/$fileFormat/$wikiFormat.$fileFormat"),true);
            makeXMLFile('<people />', $arrOfData,$wikiFormat);
        } else if($fileFormat == 'xml'){
            $arrOfData = simplexml_load_string(file_get_contents("files/$fileFormat/$wikiFormat.$fileFormat"));
            makeJSONFile($wikiFormat, $arrOfData->item);
        }

        $response = [
        "message" => "File generation succesfull!",
        "url" => "files/$format/". $wikiFormat . "." . $format,
        "fileType" => $_GET['format'],
        "fileName" => $list
        ];
    } else {
        $people = wikiDataToArr('https://en.wikipedia.org/w/api.php?action=parse&page='.$wikiFormat.'&format=json');
        
        if($people['error']){
            $response = ["message" => "Error! This list can't be processed!"   ];
        } else {
            $arrOfPersons = getDescription($people);
            $arrOfData = createReadyToUseArr($arrOfPersons); 
        }
        
        if($_GET['format'] == 'xml'){
            $actionStatus = makeXMLFile('<people />',$arrOfData,$wikiFormat);
        } else if($_GET['format'] == 'json') {
            $actionStatus = makeJSONFile($wikiFormat, $arrOfData);
        }
        
        if($actionStatus){
            $response = [
            "message" => "File generation succesfull!!!!!!",
            "url" => "files/$format/". $wikiFormat ."." . $format,
            "fileType" => $_GET['format'],
            "fileName" => $list
            ];
        } else {
            $response = [
            "message" => "File generation failed!"    
            ];
        }
    }
} else {
    $response = ["message" => "Invalid link!"];
}
header('Access-Control-Allow-Origin: *');
header('Content-type:application/json;charset=utf-8');
echo json_encode($response);
?>
