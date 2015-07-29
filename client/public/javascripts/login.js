

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
                /*
                res: {
                    success: boolean,
                    message: string,
                    token: token,
                    userID: integer,
                    organizationID: integer
                }
                */
                if (res.success) {
                    //alert(res);
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

        /*
        $.post('/api/v1/auth', postData,
        function (data, status) {
            alert('post end');
            if (data.success) {
                alert(data.token);
            }
            else {
                alert('Auth failed ! data: ' + JSON.stringify(data) + ', status: ' + status);
            }
        });
        */

        //window.location.href = '';
    });
});