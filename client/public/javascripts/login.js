

$(document).ready(function() {
    //alert('ready');
    //$('#login').click(function () {
    //    $('.form-signin').submit();
    //});

    $('.form-signin').submit(function (event) {
        //alert('click');
        var postData = {
            name:     $('#inputName').val(),
            password: $('#inputPassword').val()
        };

        //alert(JSON.stringify(postData));


        $.ajax({
            url: '/api/v1/auth',
            type: 'POST',
            dataType: 'json',
            data: postData,
            error: function (xhr, status, erorr) {
                alert('error!');
                //alert('AJAX request occurs an error: ' + JSON.stringify(error));
            },
            success: function (res) {
                if (res.success) {
                    //alert(JSON.stringify(res);
                    docCookies.setItem('token', res.token);
                    docCookies.setItem('userID', res.userID);
                    docCookies.setItem('organizationID', res.organizationID);
                    window.location.href = '/';
                    //window.location.href = '/?token=' + res.token;
                }

            }
        });

        //return false;
        event.preventDefault();
    });
});